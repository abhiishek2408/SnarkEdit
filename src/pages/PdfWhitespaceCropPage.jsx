import React, { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument } from 'pdf-lib';
import { Download, Files, RotateCcw, Scissors, Undo2, Upload, X } from 'lucide-react';
import Navbar from '../components/Navbar';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const mergeBands = (bands = []) => bands
  .map(band => ({ y: Math.max(0, band.y), height: Math.max(0, band.height) }))
  .filter(band => band.height > 0)
  .sort((a, b) => a.y - b.y)
  .reduce((merged, band) => {
    const previous = merged[merged.length - 1];
    if (previous && band.y <= previous.y + previous.height) {
      previous.height = Math.max(previous.y + previous.height, band.y + band.height) - previous.y;
    } else {
      merged.push({ ...band });
    }
    return merged;
  }, []);

// Removes the selected bands completely, and pulls the content below each upward to join seamlessly!
const removeBandsFromCanvas = (source, bands) => {
  const merged = mergeBands(bands);
  if (!merged.length) return source;

  const pixels = merged.map((band) => ({
    start: Math.max(0, Math.min(source.height - 1, Math.round(band.y * source.height))),
    end: Math.max(1, Math.min(source.height, Math.round((band.y + band.height) * source.height))),
  }));
  const removedHeight = pixels.reduce((sum, band) => sum + Math.max(0, band.end - band.start), 0);
  const result = window.document.createElement('canvas');
  result.width = source.width;
  result.height = Math.max(1, source.height - Math.min(removedHeight, source.height - 1));
  const context = result.getContext('2d');
  let sourceY = 0;
  let targetY = 0;
  pixels.forEach(({ start, end }) => {
    if (start > sourceY) {
      const height = start - sourceY;
      context.drawImage(source, 0, sourceY, source.width, height, 0, targetY, source.width, height);
      targetY += height;
    }
    sourceY = Math.max(sourceY, end);
  });
  if (sourceY < source.height) {
    context.drawImage(source, 0, sourceY, source.width, source.height - sourceY, 0, targetY, source.width, source.height - sourceY);
  }
  return result;
};

const PdfPreviewPage = ({ pdfDocument, pageNumber, edit, onApply, onApplyAll, onUndo, onReset }) => {
  const [isCropping, setIsCropping] = useState(false);
  const [pendingBands, setPendingBands] = useState([]);
  const [activeBandId, setActiveBandId] = useState(null);
  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const itemRef = useRef(null);
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const viewportRef = useRef(null);
  const dragActionRef = useRef(null);
  const renderTaskRef = useRef(null);
  const originalCanvasRef = useRef(null);
  const workingCanvasRef = useRef(null);

  // Lazy render when page comes near viewport
  useEffect(() => {
    const node = itemRef.current;
    if (!node || !('IntersectionObserver' in window)) {
      setIsVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting)) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '350px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Initial render of page from PDF
  useEffect(() => {
    if (!isVisible) return undefined;
    let cancelled = false;

    const render = async () => {
      try {
        const page = await pdfDocument.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(1.15, 680 / baseViewport.width) });
        viewportRef.current = viewport;
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

        const offscreen = window.document.createElement('canvas');
        offscreen.width = Math.ceil(viewport.width * pixelRatio);
        offscreen.height = Math.ceil(viewport.height * pixelRatio);
        const offscreenCtx = offscreen.getContext('2d');

        const task = page.render({
          canvasContext: offscreenCtx,
          viewport,
          transform: pixelRatio === 1 ? null : [pixelRatio, 0, 0, pixelRatio, 0, 0],
        });
        renderTaskRef.current = task;
        await task.promise;

        if (cancelled) return;

        originalCanvasRef.current = offscreen;
        if (wrapRef.current) {
          wrapRef.current.style.width = `${viewport.width}px`;
        }
        setIsRendered(true);
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException' && !cancelled) {
          console.error(`Could not render PDF page ${pageNumber}`, err);
        }
      }
    };

    render();
    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [pdfDocument, pageNumber, isVisible]);

  // Synchronize display canvas with cut steps
  useEffect(() => {
    if (!isRendered || !originalCanvasRef.current || !canvasRef.current) return;
    const baseCanvas = originalCanvasRef.current;
    let current = baseCanvas;

    if (edit?.cutSteps?.length) {
      for (const step of edit.cutSteps) {
        if (step.bands && step.bands.length > 0) {
          current = removeBandsFromCanvas(current, step.bands);
        }
      }
    }

    workingCanvasRef.current = current;
    const canvas = canvasRef.current;
    canvas.width = current.width;
    canvas.height = current.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(current, 0, 0);
  }, [isRendered, edit]);

  const pointFromEvent = (event) => {
    const bounds = wrapRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width === 0 || bounds.height === 0) return null;
    return {
      x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
      y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
    };
  };

  const handlePointerDown = (event) => {
    if (!isCropping) return;
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    const point = pointFromEvent(event);
    if (!point) return;

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch (e) {}

    // Check if delete button on a cut was clicked
    if (event.target.closest('.pdf-crop-band-delete')) {
      return;
    }

    // Check if resize handle on a cut was clicked
    const handle = event.target.closest('[data-resize-edge]');
    if (handle) {
      const edge = handle.dataset.resizeEdge;
      const bandId = handle.dataset.bandId;
      const band = pendingBands.find(b => b.id === bandId);
      if (band) {
        dragActionRef.current = {
          mode: 'resize',
          bandId,
          edge,
          start: point,
          original: { ...band },
        };
        setActiveBandId(bandId);
        return;
      }
    }

    // Check if inside an existing cut band
    const bandElem = event.target.closest('[data-band-id]');
    if (bandElem) {
      const bandId = bandElem.dataset.bandId;
      const band = pendingBands.find(b => b.id === bandId);
      if (band) {
        dragActionRef.current = {
          mode: 'move',
          bandId,
          start: point,
          original: { ...band },
        };
        setActiveBandId(bandId);
        return;
      }
    }

    // Clicked outside existing cuts: start drawing a new cut band!
    const newBandId = 'band-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    const newBand = { id: newBandId, y: point.y, height: 0 };
    dragActionRef.current = {
      mode: 'draw',
      bandId: newBandId,
      start: point,
    };
    setActiveBandId(newBandId);
    setPendingBands(current => [...current, newBand]);
  };

  const handlePointerMove = (event) => {
    if (!dragActionRef.current || !isCropping) return;
    const point = pointFromEvent(event);
    if (!point) return;
    const action = dragActionRef.current;
    const dy = point.y - action.start.y;

    if (action.mode === 'draw') {
      const top = Math.max(0, Math.min(action.start.y, point.y));
      const height = Math.abs(point.y - action.start.y);
      setPendingBands(current => current.map(b => (b.id === action.bandId ? { ...b, y: top, height } : b)));
      return;
    }

    if (action.mode === 'move') {
      const original = action.original;
      const newY = Math.max(0, Math.min(1 - original.height, original.y + dy));
      setPendingBands(current => current.map(b => (b.id === action.bandId ? { ...b, y: newY } : b)));
      return;
    }

    if (action.mode === 'resize') {
      const original = action.original;
      const minSize = 0.005;
      let top = original.y;
      let bottom = original.y + original.height;

      if (action.edge === 'n') {
        top = Math.max(0, Math.min(bottom - minSize, original.y + dy));
      } else if (action.edge === 's') {
        bottom = Math.min(1, Math.max(top + minSize, original.y + original.height + dy));
      }

      setPendingBands(current => current.map(b => (b.id === action.bandId ? { ...b, y: top, height: bottom - top } : b)));
    }
  };

  const handlePointerUp = (event) => {
    if (event?.currentTarget?.hasPointerCapture?.(event.pointerId)) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch (e) {}
    }

    if (dragActionRef.current?.mode === 'draw') {
      const drawnId = dragActionRef.current.bandId;
      setPendingBands(current => current.filter(b => (b.id === drawnId ? b.height >= 0.005 : true)));
    }

    dragActionRef.current = null;
  };

  const removePendingBand = (bandId) => {
    setPendingBands(current => current.filter(b => b.id !== bandId));
    if (activeBandId === bandId) setActiveBandId(null);
  };

  const applyPendingCuts = () => {
    const validBands = pendingBands.filter(b => b.height >= 0.005);
    if (!validBands.length) return;

    const existingSteps = edit?.cutSteps ? [...edit.cutSteps] : [];
    const cleanBands = mergeBands(validBands.map(b => ({ y: b.y, height: b.height })));
    const nextSteps = [...existingSteps, { bands: cleanBands }];
    const totalCuts = nextSteps.reduce((sum, s) => sum + s.bands.length, 0);

    onApply(pageNumber, {
      cutSteps: nextSteps,
      totalCuts,
    });

    setPendingBands([]);
    setIsCropping(false);
  };

  const applyPendingCutsToAll = () => {
    const validBands = pendingBands.filter(b => b.height >= 0.005);
    if (!validBands.length) return;
    const cleanBands = mergeBands(validBands.map(b => ({ y: b.y, height: b.height })));
    onApplyAll(cleanBands);
    setPendingBands([]);
    setIsCropping(false);
  };

  const validBands = pendingBands.filter(b => b.height >= 0.005);
  const totalCutsApplied = edit?.totalCuts || edit?.cutSteps?.reduce((sum, s) => sum + s.bands.length, 0) || 0;

  return (
    <article className="pdf-all-pages-item" ref={itemRef}>
      <div className="pdf-all-pages-heading">
        <strong>Page {pageNumber}</strong>
        {totalCutsApplied > 0 ? (
          <span className="pdf-page-removed-status">
            ✓ {totalCutsApplied} section{totalCutsApplied === 1 ? '' : 's'} cut out · Merged
          </span>
        ) : isCropping ? (
          <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
            {validBands.length > 0
              ? `${validBands.length} section${validBands.length > 1 ? 's' : ''} marked to cut out & merge`
              : 'Drag across sections you want to cut out (Multiple cuts supported)'}
          </span>
        ) : (
          <span>Ready to crop</span>
        )}
      </div>

      <div className="pdf-crop-canvas-wrap" ref={wrapRef}>
        <canvas ref={canvasRef} />

        {isCropping && validBands.length === 0 && (
          <div className="pdf-crop-draw-hint">
            <Scissors size={18} />
            <span>Drag over any section to cut out. You can draw multiple cuts!</span>
          </div>
        )}

        <div
          className={`pdf-crop-selection-layer ${isCropping ? 'active' : ''}`}
          style={{ display: isCropping ? 'block' : 'none', pointerEvents: isCropping && isRendered ? 'auto' : 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {isCropping && pendingBands.map((band, index) => {
            if (band.height < 0.001) return null;
            return (
              <div
                key={band.id}
                data-band-id={band.id}
                className={`pdf-crop-selection ${activeBandId === band.id ? 'active' : ''}`}
                style={{
                  left: '0%',
                  top: `${band.y * 100}%`,
                  width: '100%',
                  height: `${band.height * 100}%`,
                }}
              >
                {/* Corner Accents */}
                <span className="pdf-crop-corner corner-nw" />
                <span className="pdf-crop-corner corner-ne" />
                <span className="pdf-crop-corner corner-se" />
                <span className="pdf-crop-corner corner-sw" />

                {/* Top & Bottom Resize Handles */}
                <div
                  className="pdf-crop-handle handle-n"
                  data-band-id={band.id}
                  data-resize-edge="n"
                  title="Drag to adjust top cut line"
                />
                <div
                  className="pdf-crop-handle handle-s"
                  data-band-id={band.id}
                  data-resize-edge="s"
                  title="Drag to adjust bottom cut line"
                />

                {/* Cut Badge */}
                <div className="pdf-crop-band-badge">
                  <Scissors size={12} />
                  <span>Cut #{index + 1} ({Math.round(band.height * 100)}%)</span>
                </div>

                {/* Delete button */}
                <button
                  type="button"
                  className="pdf-crop-band-delete"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    removePendingBand(band.id);
                  }}
                  title="Delete this cut"
                >
                  <X size={13} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pdf-all-pages-actions">
        {isCropping ? (
          <>
            <button
              className="btn-primary"
              type="button"
              onClick={applyPendingCuts}
              disabled={validBands.length === 0}
              title="Cut out all selected sections and merge the remaining parts together"
            >
              <Scissors size={16} />
              <span>
                {validBands.length > 0
                  ? `Cut & Merge (${validBands.length} Section${validBands.length > 1 ? 's' : ''})`
                  : 'Select section to cut'}
              </span>
            </button>
            {validBands.length > 0 && (
              <>
                <button
                  className="pdf-clear-crop"
                  type="button"
                  onClick={applyPendingCutsToAll}
                  title="Cut out these exact sections from every page in the PDF"
                >
                  <Files size={15} />
                  <span>Cut on All Pages</span>
                </button>
                <button
                  className="pdf-clear-crop"
                  type="button"
                  onClick={() => setPendingBands([])}
                  title="Clear current selections"
                >
                  <RotateCcw size={15} />
                  <span>Clear Cuts</span>
                </button>
              </>
            )}
            <button
              className="pdf-clear-crop"
              type="button"
              onClick={() => {
                setPendingBands([]);
                setIsCropping(false);
              }}
            >
              <X size={15} />
              <span>Cancel</span>
            </button>
          </>
        ) : edit && totalCutsApplied > 0 ? (
          <>
            <button
              className="btn-primary"
              type="button"
              onClick={() => {
                setIsCropping(true);
                setPendingBands([]);
              }}
              title="Cut another section from this merged page"
            >
              <Scissors size={16} />
              <span>Cut Another Section</span>
            </button>
            <button
              className="pdf-clear-crop"
              type="button"
              onClick={() => onUndo(pageNumber)}
              title="Undo the last cut operation on this page"
            >
              <Undo2 size={15} />
              <span>Undo Last Cut</span>
            </button>
            <button
              className="pdf-clear-crop"
              type="button"
              onClick={() => onReset(pageNumber)}
              title="Reset this page back to original"
            >
              <RotateCcw size={15} />
              <span>Reset to Original</span>
            </button>
          </>
        ) : (
          <button
            className="btn-primary"
            type="button"
            onClick={() => {
              setIsCropping(true);
              setPendingBands([]);
            }}
            disabled={!isRendered}
          >
            <Scissors size={16} />
            <span>Crop & Remove Section</span>
          </button>
        )}
      </div>
    </article>
  );
};

const PdfWhitespaceCropPage = ({ theme, toggleTheme }) => {
  const [file, setFile] = useState(null);
  const [pdfDocument, setPdfDocument] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageEdits, setPageEdits] = useState({});
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handleFile = async (selected) => {
    const nextFile = selected?.[0];
    if (!nextFile) return;
    setFile(null);
    setPdfDocument(null);
    setPageEdits({});
    setPageCount(0);
    setError('');
    try {
      const data = new Uint8Array(await nextFile.arrayBuffer());
      const document = await pdfjs.getDocument({ data: data.slice() }).promise;
      setFile(nextFile);
      setPdfDocument(document);
      setPageCount(document.numPages);
    } catch (err) {
      setError(err.message || 'Could not open this PDF. Try a valid, unprotected PDF.');
    }
  };

  const savePageEdit = (pageNumber, edit) => {
    setPageEdits(current => ({ ...current, [pageNumber]: edit }));
    setError('');
  };

  const undoPageEdit = (pageNumber) => {
    setPageEdits(current => {
      const currentEdit = current[pageNumber];
      if (!currentEdit || !currentEdit.cutSteps || currentEdit.cutSteps.length <= 1) {
        const next = { ...current };
        delete next[pageNumber];
        return next;
      }
      const nextSteps = currentEdit.cutSteps.slice(0, -1);
      const totalCuts = nextSteps.reduce((sum, s) => sum + s.bands.length, 0);
      return {
        ...current,
        [pageNumber]: {
          cutSteps: nextSteps,
          totalCuts,
        },
      };
    });
  };

  const resetPage = (pageNumber) => {
    setPageEdits(current => {
      const next = { ...current };
      delete next[pageNumber];
      return next;
    });
  };

  const resetAllPages = () => {
    setPageEdits({});
  };

  const applyCropToAllPages = (bands) => {
    if (!bands || !bands.length || pageCount === 0) return;
    setPageEdits(current => {
      const next = { ...current };
      for (let i = 1; i <= pageCount; i++) {
        const existing = current[i];
        const existingSteps = existing?.cutSteps ? [...existing.cutSteps] : [];
        const nextSteps = [...existingSteps, { bands }];
        const totalCuts = nextSteps.reduce((sum, s) => sum + s.bands.length, 0);
        next[i] = { cutSteps: nextSteps, totalCuts };
      }
      return next;
    });
  };

  const download = async () => {
    if (!file || !Object.keys(pageEdits).length) return;
    setIsExporting(true);
    setError('');
    try {
      const originalBytes = await file.arrayBuffer();
      const original = await PDFDocument.load(originalBytes, { ignoreEncryption: true });
      const output = await PDFDocument.create();
      const numPages = original.getPageCount();

      for (let index = 0; index < numPages; index++) {
        const pageNumber = index + 1;
        const edit = pageEdits[pageNumber];

        if (!edit || !edit.cutSteps?.length) {
          const [copiedPage] = await output.copyPages(original, [index]);
          output.addPage(copiedPage);
          continue;
        }

        const sourcePage = await pdfDocument.getPage(pageNumber);
        const baseViewport = sourcePage.getViewport({ scale: 1 });
        const scale = 2.5; // High resolution rendering for sharp print-quality output
        const viewport = sourcePage.getViewport({ scale });
        const sourceCanvas = window.document.createElement('canvas');
        sourceCanvas.width = Math.ceil(viewport.width);
        sourceCanvas.height = Math.ceil(viewport.height);
        await sourcePage.render({ canvasContext: sourceCanvas.getContext('2d'), viewport }).promise;

        let workingCanvas = sourceCanvas;
        for (const step of edit.cutSteps) {
          if (step.bands && step.bands.length > 0) {
            workingCanvas = removeBandsFromCanvas(workingCanvas, step.bands);
          }
        }

        const png = await new Promise(resolve => workingCanvas.toBlob(resolve, 'image/png'));
        if (png) {
          const image = await output.embedPng(await png.arrayBuffer());
          const pageWidth = baseViewport.width;
          const pageHeight = (workingCanvas.height / workingCanvas.width) * pageWidth;
          const newPage = output.addPage([pageWidth, pageHeight]);
          newPage.drawImage(image, { x: 0, y: 0, width: pageWidth, height: pageHeight });
        }
      }

      const blob = new Blob([await output.save()], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = `${file.name.replace(/\.pdf$/i, '')}-cropped.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Could not export the cropped PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const editedCount = Object.keys(pageEdits).length;
  const totalCutsCount = Object.values(pageEdits).reduce(
    (sum, edit) => sum + (edit.cutSteps?.reduce((s, step) => s + (step.bands?.length || 0), 0) || 0),
    0
  );

  return (
    <div className="app-container reducer-page pdf-tool-page">
      <Navbar onHome={() => {}} theme={theme} toggleTheme={toggleTheme} hideEditorControls={true} />
      <main className="reducer-shell">
        <section className="reducer-workspace">
          {!pdfDocument && (
            <>
              <div className="reducer-heading">
                <div>
                  <p>PDF Tool</p>
                  <h1>Crop & Merge PDF Sections</h1>
                </div>
                <Scissors size={34} />
              </div>
              <p className="pdf-stacker-intro">
                Select unwanted sections or whitespace gaps to cut them out. You can make multiple cuts, and remaining parts merge together seamlessly with zero white gap.
              </p>
            </>
          )}

          <div className={`pdf-crop-layout ${pdfDocument ? 'has-pdf' : 'no-pdf'}`}>
            <section className="reducer-panel pdf-crop-controls">
              <label className="reducer-upload">
                <Upload size={24} />
                <strong>{file ? file.name : 'Choose a PDF'}</strong>
                <span>{file ? `${pageCount} page${pageCount > 1 ? 's' : ''} loaded` : 'Select the PDF you want to crop'}</span>
                <input type="file" accept="application/pdf,.pdf" onChange={(event) => handleFile(event.target.files)} />
              </label>

              {file && (
                <>
                  <div className="pdf-crop-stats">
                    <div className="pdf-crop-count">
                      <strong>{editedCount}</strong> of <strong>{pageCount}</strong> pages edited
                      {totalCutsCount > 0 && ` (${totalCutsCount} total cuts applied)`}
                    </div>
                  </div>

                  {editedCount > 0 && (
                    <div className="pdf-crop-bulk-actions">
                      <button
                        className="pdf-clear-crop"
                        type="button"
                        onClick={resetAllPages}
                      >
                        <RotateCcw size={15} />
                        <span>Reset All Pages</span>
                      </button>
                    </div>
                  )}

                  <button
                    className="btn-primary reducer-action"
                    type="button"
                    onClick={download}
                    disabled={!editedCount || isExporting}
                  >
                    <Download size={18} />
                    <span>{isExporting ? 'Generating PDF...' : 'Download Merged PDF'}</span>
                  </button>

                  <p className="pdf-crop-tip">
                    💡 <strong>Multiple Cuts Support:</strong> Click <strong>Crop & Remove Section</strong>, drag across any sections you want to cut out (you can select multiple areas simultaneously), then click <strong>Cut & Merge Parts</strong>. You can also click <strong>Cut Another Section</strong> to make further cuts on the merged result, or <strong>Undo Last Cut</strong> anytime!
                  </p>
                </>
              )}

              {error && <p className="reducer-error">{error}</p>}
            </section>

            {pdfDocument && (
              <section className="reducer-panel pdf-crop-preview-panel">
                <div className="pdf-all-pages-list">
                  {Array.from({ length: pageCount }, (_, index) => {
                    const pageNumber = index + 1;
                    return (
                      <PdfPreviewPage
                        key={pageNumber}
                        pdfDocument={pdfDocument}
                        pageNumber={pageNumber}
                        edit={pageEdits[pageNumber]}
                        onApply={savePageEdit}
                        onApplyAll={applyCropToAllPages}
                        onUndo={undoPageEdit}
                        onReset={resetPage}
                      />
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default PdfWhitespaceCropPage;
