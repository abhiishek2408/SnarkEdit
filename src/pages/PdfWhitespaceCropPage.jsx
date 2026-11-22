import React, { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument } from 'pdf-lib';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Files,
  RotateCcw,
  Scissors,
  Undo2,
  Upload,
  X,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Check,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import PageDimensionAxis from '../components/PageDimensionAxis';

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

// Single Page Preview & Interactive Canvas
const PdfPreviewPage = ({
  pdfDocument,
  pageNumber,
  edit,
  isActive,
  isCropping,
  pendingBands,
  activeBandId,
  setPendingBands,
  setActiveBandId,
  onSelectPage,
  onApplySingleBand,
  instantCut = true,
}) => {
  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(() => typeof window === 'undefined' || !('IntersectionObserver' in window));
  const [pageSize, setPageSize] = useState({ width: 595, height: 842 });

  const itemRef = useRef(null);
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const viewportRef = useRef(null);
  const dragActionRef = useRef(null);
  const renderTaskRef = useRef(null);
  const originalCanvasRef = useRef(null);
  const workingCanvasRef = useRef(null);
  const originalWidthPtRef = useRef(595);
  const originalHeightPtRef = useRef(842);

  // Lazy render when page comes near viewport
  useEffect(() => {
    const node = itemRef.current;
    if (!node || !('IntersectionObserver' in window)) {
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
    if (!isVisible && !isActive) return undefined;
    let cancelled = false;

    const render = async () => {
      try {
        const page = await pdfDocument.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        originalWidthPtRef.current = Math.round(baseViewport.width);
        originalHeightPtRef.current = Math.round(baseViewport.height);
        setPageSize({
          width: Math.round(baseViewport.width),
          height: Math.round(baseViewport.height),
        });
        const displayScale = Math.min(1.6, Math.max(1.1, 820 / baseViewport.width));
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const renderScale = displayScale * pixelRatio;
        const viewport = page.getViewport({ scale: renderScale });
        viewportRef.current = viewport;

        const offscreen = window.document.createElement('canvas');
        offscreen.width = Math.ceil(viewport.width);
        offscreen.height = Math.ceil(viewport.height);
        const offscreenCtx = offscreen.getContext('2d');
        offscreenCtx.fillStyle = '#ffffff';
        offscreenCtx.fillRect(0, 0, offscreen.width, offscreen.height);

        const task = page.render({
          canvasContext: offscreenCtx,
          viewport,
        });
        renderTaskRef.current = task;
        await task.promise;

        if (cancelled) return;

        originalCanvasRef.current = offscreen;
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
  }, [pdfDocument, pageNumber, isVisible, isActive]);

  // Synchronize display canvas with cut steps
  useEffect(() => {
    if (!isRendered || !originalCanvasRef.current || !canvasRef.current) return;
    const baseCanvas = originalCanvasRef.current;
    let stitchedContent = baseCanvas;

    if (edit?.cutSteps?.length) {
      for (const step of edit.cutSteps) {
        if (step.bands && step.bands.length > 0) {
          stitchedContent = removeBandsFromCanvas(stitchedContent, step.bands);
        }
      }
    }

    workingCanvasRef.current = stitchedContent;
    const canvas = canvasRef.current;
    canvas.width = stitchedContent.width;
    canvas.height = stitchedContent.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(stitchedContent, 0, 0);

    // Dynamically update pageSize.height so PageDimensionAxis updates instantly
    if (baseCanvas.height > 0) {
      const currentHeightPt = Math.round((originalHeightPtRef.current * stitchedContent.height) / baseCanvas.height);
      setPageSize(prev => ({ ...prev, height: currentHeightPt }));
    }
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
    if (!isCropping || !isActive) return;
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    event.stopPropagation();
    const point = pointFromEvent(event);
    if (!point) return;

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch { /* ignore capture error */ }

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

    // Check if moving an existing cut
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
    if (!dragActionRef.current || !isCropping || !isActive) return;
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
    event?.stopPropagation?.();
    if (event?.currentTarget?.hasPointerCapture?.(event.pointerId)) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch { /* ignore release error */ }
    }

    if (dragActionRef.current?.mode === 'draw') {
      const drawnId = dragActionRef.current.bandId;
      const drawnBand = pendingBands.find(b => b.id === drawnId);
      if (drawnBand && drawnBand.height >= 0.005) {
        if (instantCut && onApplySingleBand) {
          onApplySingleBand(drawnBand);
        } else {
          setPendingBands(current => current.filter(b => (b.id === drawnId ? b.height >= 0.005 : true)));
        }
      } else {
        setPendingBands(current => current.filter(b => b.id !== drawnId));
      }
    }

    dragActionRef.current = null;
  };

  const removePendingBand = (bandId) => {
    setPendingBands(current => current.filter(b => b.id !== bandId));
    if (activeBandId === bandId) setActiveBandId(null);
  };

  const validBands = isActive ? pendingBands.filter(b => b.height >= 0.005) : [];
  const totalCutsApplied = edit?.totalCuts || edit?.cutSteps?.reduce((sum, s) => sum + s.bands.length, 0) || 0;

  return (
    <article
      id={`crop-page-${pageNumber}`}
      className={`pdf-all-pages-item ${isActive ? 'active' : ''}`}
      ref={itemRef}
      onClick={() => {
        if (!isActive) {
          onSelectPage(pageNumber);
        }
      }}
    >
      <div className="pdf-all-pages-heading">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <strong>Page {pageNumber}</strong>
          {isActive && (
            <span className="pdf-crop-active-badge">Active Page</span>
          )}
        </div>

        {totalCutsApplied > 0 ? (
          <span className="pdf-page-removed-status">
            ✓ {totalCutsApplied} section{totalCutsApplied === 1 ? '' : 's'} cut out · Merged
          </span>
        ) : isActive && isCropping ? (
          <span style={{ color: 'var(--primary)', fontWeight: 600 }}>
            {validBands.length > 0
              ? `${validBands.length} cut${validBands.length > 1 ? 's' : ''} marked`
              : 'Drag across sections to cut out'}
          </span>
        ) : (
          <span>{isActive ? 'Selected' : 'Click to select'}</span>
        )}
      </div>

      <PageDimensionAxis
        widthPt={pageSize.width}
        heightPt={pageSize.height}
        mode="crop"
        cutBands={isActive && isCropping ? pendingBands : (edit?.cutSteps?.flatMap(s => s.bands) || [])}
      >
        <div className="pdf-crop-canvas-wrap" ref={wrapRef}>
          <canvas ref={canvasRef} />

          {isActive && isCropping && validBands.length === 0 && (
            <div className="pdf-crop-draw-hint">
              <Scissors size={16} />
              <span>Drag across any section to cut out</span>
            </div>
          )}

          {/* Selection Cut Layer (Active only on the currently active page during crop mode) */}
          <div
            className={`pdf-crop-selection-layer ${isActive && isCropping ? 'active' : ''}`}
            style={{
              display: isActive && isCropping ? 'block' : 'none',
              pointerEvents: isActive && isCropping && isRendered ? 'auto' : 'none',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onClick={(e) => e.stopPropagation()}
          >
            {isActive && isCropping && pendingBands.map((band, index) => {
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

                  {/* Band Actions: Cut Now & Delete */}
                  <div className="pdf-crop-band-actions">
                    <button
                      type="button"
                      className="pdf-crop-band-cut-now-btn"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onApplySingleBand) {
                          onApplySingleBand(band);
                        }
                      }}
                      title="Cut & Shrink page immediately"
                    >
                      <Scissors size={11} />
                      <span>Cut Now</span>
                    </button>
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
                </div>
              );
            })}
          </div>
        </div>
      </PageDimensionAxis>
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

  // Unified global crop state for the left sidebar
  const [activePage, setActivePage] = useState(1);
  const [isCropping, setIsCropping] = useState(false);
  const [pendingBands, setPendingBands] = useState([]);
  const [activeBandId, setActiveBandId] = useState(null);
  const [instantCut, setInstantCut] = useState(true);

  const handleFile = async (selected) => {
    const nextFile = selected?.[0];
    if (!nextFile) return;
    setFile(null);
    setPdfDocument(null);
    setPageEdits({});
    setPageCount(0);
    setActivePage(1);
    setIsCropping(false);
    setPendingBands([]);
    setError('');
    try {
      const data = new Uint8Array(await nextFile.arrayBuffer());
      const document = await pdfjs.getDocument({ data: data.slice() }).promise;
      setFile(nextFile);
      setPdfDocument(document);
      setPageCount(document.numPages);
    } catch (err) {
      console.error(err);
      setError('Could not read this PDF. Try another file.');
    }
  };

  const handleSelectPage = (pageNum) => {
    if (pageNum === activePage) return;
    setActivePage(pageNum);
    // Clear pending bands only when switching to a completely different page
    setPendingBands([]);
    setActiveBandId(null);
    const elem = document.getElementById(`crop-page-${pageNum}`);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const startCropping = (pageNum) => {
    const targetPage = pageNum || activePage;
    setActivePage(targetPage);
    setIsCropping(true);
    setPendingBands([]);
    setActiveBandId(null);
    const elem = document.getElementById(`crop-page-${targetPage}`);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const toggleCropping = () => {
    if (isCropping) {
      setPendingBands([]);
      setActiveBandId(null);
      setIsCropping(false);
    } else {
      startCropping(activePage);
    }
  };

  const applyPendingCutsToCurrentPage = () => {
    const validBands = pendingBands.filter(b => b.height >= 0.005);
    if (!validBands.length) return;

    // Apply cuts strictly and ONLY to the active page
    const targetPage = activePage;
    const currentEdit = pageEdits[targetPage];
    const existingSteps = currentEdit?.cutSteps ? [...currentEdit.cutSteps] : [];
    const cleanBands = mergeBands(validBands.map(b => ({ y: b.y, height: b.height })));
    const nextSteps = [...existingSteps, { bands: cleanBands }];
    const totalCuts = nextSteps.reduce((sum, s) => sum + s.bands.length, 0);

    setPageEdits(prev => ({
      ...prev,
      [targetPage]: {
        cutSteps: nextSteps,
        totalCuts,
      },
    }));

    setPendingBands([]);
    setActiveBandId(null);
    // Keep isCropping true so user can continue cutting until they click to deselect
  };

  const applySingleBand = (band) => {
    if (!band || band.height < 0.005) return;
    const targetPage = activePage;
    const currentEdit = pageEdits[targetPage];
    const existingSteps = currentEdit?.cutSteps ? [...currentEdit.cutSteps] : [];
    const cleanBands = [{ y: band.y, height: band.height }];
    const nextSteps = [...existingSteps, { bands: cleanBands }];
    const totalCuts = nextSteps.reduce((sum, s) => sum + s.bands.length, 0);

    setPageEdits(prev => ({
      ...prev,
      [targetPage]: {
        cutSteps: nextSteps,
        totalCuts,
      },
    }));

    setPendingBands(current => current.filter(b => b.id !== band.id));
    setActiveBandId(null);
  };

  const undoActivePageEdit = () => {
    setPageEdits(prev => {
      const current = prev[activePage];
      if (!current || !current.cutSteps || current.cutSteps.length === 0) return prev;
      const nextSteps = current.cutSteps.slice(0, -1);
      if (nextSteps.length === 0) {
        const next = { ...prev };
        delete next[activePage];
        return next;
      }
      return {
        ...prev,
        [activePage]: {
          cutSteps: nextSteps,
          totalCuts: nextSteps.reduce((sum, s) => sum + s.bands.length, 0),
        },
      };
    });
  };

  const resetActivePage = () => {
    setPageEdits(prev => {
      const next = { ...prev };
      delete next[activePage];
      return next;
    });
  };

  const resetAllPages = () => {
    setPageEdits({});
    setPendingBands([]);
    setIsCropping(false);
  };

  // Build the final merged PDF
  const download = async () => {
    if (!file || !pageCount) return;
    setIsExporting(true);
    setError('');

    try {
      const sourcePdf = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      const outputPdf = await PDFDocument.create();

      for (let index = 0; index < pageCount; index++) {
        const pageNumber = index + 1;
        const edit = pageEdits[pageNumber];

        if (!edit || !edit.cutSteps?.length) {
          const [copied] = await outputPdf.copyPages(sourcePdf, [index]);
          outputPdf.addPage(copied);
          continue;
        }

        const sourcePage = await pdfDocument.getPage(pageNumber);
        const baseVp = sourcePage.getViewport({ scale: 1 });
        const scale = Math.min(2.5, 2600 / baseVp.width);
        const exportVp = sourcePage.getViewport({ scale });

        const canvas = window.document.createElement('canvas');
        canvas.width = Math.ceil(exportVp.width);
        canvas.height = Math.ceil(exportVp.height);
        const ctx = canvas.getContext('2d');
        await sourcePage.render({ canvasContext: ctx, viewport: exportVp }).promise;

        let workingCanvas = canvas;
        for (const step of edit.cutSteps) {
          if (step.bands && step.bands.length > 0) {
            workingCanvas = removeBandsFromCanvas(workingCanvas, step.bands);
          }
        }

        const pngBlob = await new Promise((resolve) => workingCanvas.toBlob(resolve, 'image/png'));
        const embeddedImage = await outputPdf.embedPng(await pngBlob.arrayBuffer());

        const finalHeightPt = baseVp.height * (workingCanvas.height / canvas.height);
        const newPage = outputPdf.addPage([baseVp.width, Math.max(10, finalHeightPt)]);
        newPage.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: baseVp.width,
          height: Math.max(10, finalHeightPt),
        });
      }

      const mergedBytes = await outputPdf.save();
      const blob = new Blob([mergedBytes], { type: 'application/pdf' });
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

  const activePageEdit = pageEdits[activePage];
  const activePageCutsCount = activePageEdit?.totalCuts || activePageEdit?.cutSteps?.reduce((sum, s) => sum + s.bands.length, 0) || 0;
  const validBands = pendingBands.filter(b => b.height >= 0.005);

  return (
    <div className="app-container reducer-page pdf-tool-page pdf-crop-page">
      <Navbar onHome={() => {}} theme={theme} toggleTheme={toggleTheme} hideEditorControls={true} />
      <main className="reducer-shell">
        <section className="reducer-workspace">
          {/* Header (shown only when no PDF is loaded) */}
          {!pdfDocument && (
            <div className="reducer-heading">
              <div>
                <p>PDF Tools</p>
                <h1>Crop PDF Content</h1>
              </div>
              <Scissors size={34} className="desktop-only" />
            </div>
          )}

          {!pdfDocument ? (
            <div className="pdf-merge-upload-hero">
              <p className="pdf-stacker-intro" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 1.5rem' }}>
                Select unwanted sections or whitespace gaps to cut them out. Remaining parts merge together seamlessly with zero white gap.
              </p>
              <label className="pdf-merge-dropzone">
                <div className="pdf-merge-upload-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
                  <Scissors size={32} />
                </div>
                <strong style={{ fontSize: '1.25rem' }}>Select PDF to Crop</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Drag & drop or click to browse
                </span>
                <input type="file" accept="application/pdf,.pdf" onChange={(event) => handleFile(event.target.files)} style={{ display: 'none' }} />
              </label>

              <div className="pdf-merge-features-badges">
                <div className="pdf-merge-badge-item">
                  <Scissors size={15} style={{ color: '#3b82f6' }} />
                  <span>Precision Cutting</span>
                </div>
                <div className="pdf-merge-badge-item">
                  <Sparkles size={15} style={{ color: '#3b82f6' }} />
                  <span>Gapless Merging</span>
                </div>
                <div className="pdf-merge-badge-item">
                  <CheckCircle2 size={15} style={{ color: '#10b981' }} />
                  <span>Lossless Quality</span>
                </div>
              </div>
            </div>
          ) : (
            <div className={`pdf-crop-layout ${pdfDocument ? 'has-pdf' : 'no-pdf'}`}>
              {/* Left Column: Stats & Export */}
              <aside className="pdf-remove-sidebar">
                {/* File Info */}
                <div className="reducer-panel pdf-remove-card">
                  <div className="pdf-remove-file-header">
                    <div className="pdf-remove-file-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
                      <Files size={20} />
                    </div>
                    <div className="pdf-remove-file-meta">
                      <strong title={file?.name}>{file?.name}</strong>
                      <span>{pageCount} pages</span>
                    </div>
                  </div>
                  <button className="pdf-remove-change-btn" onClick={() => document.querySelector('.change-pdf-input').click()}>
                    <RefreshCw size={14} />
                    <span>Change PDF</span>
                    <input
                      type="file"
                      className="change-pdf-input"
                      accept="application/pdf,.pdf"
                      onChange={(e) => handleFile(e.target.files)}
                      style={{ display: 'none' }}
                    />
                  </button>
                </div>

                {/* Edit Stats */}
                <div className="reducer-panel pdf-remove-card">
                  <h3 className="pdf-remove-section-title">Edit Summary</h3>
                  <div className="pdf-split-stats-box" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                    <div className="pdf-split-stat-row">
                      <span>Edited Pages:</span>
                      <strong style={{ color: editedCount > 0 ? '#10b981' : 'inherit' }}>{editedCount}</strong>
                    </div>
                    <div className="pdf-split-stat-row">
                      <span>Total Cuts:</span>
                      <strong>{totalCutsCount}</strong>
                    </div>
                  </div>

                  <button
                    className="btn-primary pdf-crop-download-btn"
                    type="button"
                    onClick={download}
                    disabled={!editedCount || isExporting}
                  >
                    {isExporting ? (
                      <>
                        <RefreshCw size={17} className="spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Download size={17} />
                        <span>Download Result</span>
                      </>
                    )}
                  </button>

                  {editedCount > 0 && (
                    <button
                      className="pdf-remove-quick-btn"
                      type="button"
                      onClick={resetAllPages}
                      style={{ borderStyle: 'dashed' }}
                    >
                      <RotateCcw size={14} />
                      <span>Reset All Edits</span>
                    </button>
                  )}
                </div>

                <div className="pdf-crop-side-guide" style={{ background: 'var(--bg-card)' }}>
                  <strong>💡 How it works:</strong>
                  <ol>
                    <li>Click a page to select it</li>
                    <li>Click <strong>Start Cutting</strong> below</li>
                    <li>Drag over areas to remove</li>
                    <li>Click <strong>Apply Cuts</strong></li>
                  </ol>
                </div>

                {error && (
                  <div className="reducer-error pdf-remove-alert-box">
                    <AlertCircle size={15} />
                    <span>{error}</span>
                  </div>
                )}
              </aside>

              {/* Center Column: PDF Preview */}
              <section className="pdf-remove-gallery-panel pdf-crop-preview-panel">
                <div className="pdf-split-page-nav-bar" style={{ paddingBottom: '0.65rem' }}>
                  <div className="pdf-split-nav-controls">
                    <button
                      type="button"
                      className="pdf-split-nav-arrow"
                      disabled={activePage <= 1}
                      onClick={() => handleSelectPage(Math.max(1, activePage - 1))}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span className="pdf-split-page-counter">
                      Page <strong>{activePage}</strong> of <strong>{pageCount}</strong>
                    </span>
                    <button
                      type="button"
                      className="pdf-split-nav-arrow"
                      disabled={activePage >= pageCount}
                      onClick={() => handleSelectPage(Math.min(pageCount, activePage + 1))}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  <div className="pdf-split-page-pills">
                    {Array.from({ length: pageCount }, (_, i) => {
                      const pNum = i + 1;
                      const hasEdits = Boolean(pageEdits[pNum]);
                      return (
                        <button
                          key={pNum}
                          type="button"
                          className={`pdf-split-pill ${activePage === pNum ? 'active' : ''} ${hasEdits ? 'has-split' : ''}`}
                          onClick={() => handleSelectPage(pNum)}
                        >
                          <span>{pNum}</span>
                          {hasEdits && <span className="pill-dot" style={{ background: '#10b981' }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pdf-all-pages-list" style={{ background: 'var(--tool-bg)', borderRadius: '8px' }}>
                  {Array.from({ length: pageCount }, (_, index) => {
                    const pageNumber = index + 1;
                    return (
                      <PdfPreviewPage
                        key={pageNumber}
                        pdfDocument={pdfDocument}
                        pageNumber={pageNumber}
                        edit={pageEdits[pageNumber]}
                        isActive={activePage === pageNumber}
                        isCropping={isCropping && activePage === pageNumber}
                        pendingBands={pendingBands}
                        activeBandId={activeBandId}
                        setPendingBands={setPendingBands}
                        setActiveBandId={setActiveBandId}
                        onSelectPage={handleSelectPage}
                        onApplySingleBand={applySingleBand}
                        instantCut={instantCut}
                      />
                    );
                  })}
                </div>
              </section>

              {/* Right Column: Controls */}
              <aside className="pdf-crop-right-panel">
                <div className="pdf-crop-right-header">
                  <div>
                    <span className="pdf-crop-right-header-title">Tool Controls</span>
                    <strong className="pdf-crop-right-header-page">
                      Page {activePage}
                    </strong>
                  </div>
                  {activePageCutsCount > 0 && (
                    <span className="pdf-crop-page-cut-badge">
                      {activePageCutsCount} Cuts
                    </span>
                  )}
                </div>

                <div className="pdf-crop-main-actions">
                  <button
                    className={`btn-primary pdf-crop-btn-lg ${isCropping ? 'pdf-crop-btn-active' : ''}`}
                    type="button"
                    onClick={toggleCropping}
                  >
                    <Scissors size={18} />
                    <span>{isCropping ? 'Stop Cutting Content' : 'Cut Pdf'}</span>
                  </button>

                  {isCropping && (
                    <div className="pdf-crop-active-section" style={{ marginTop: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.45rem 0.65rem',
                        background: 'var(--tool-bg)',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                          ⚡ Instant Cut on Release
                        </span>
                        <input
                          type="checkbox"
                          checked={instantCut}
                          onChange={(e) => setInstantCut(e.target.checked)}
                          style={{ accentColor: 'var(--primary)', cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </label>
                      {validBands.length > 0 ? (
                        <>
                          <button
                            className="btn-primary pdf-crop-btn-lg"
                            type="button"
                            onClick={applyPendingCutsToCurrentPage}
                          >
                            <Check size={16} />
                            <span>Apply {validBands.length} Cut{validBands.length > 1 ? 's' : ''}</span>
                          </button>
                          <button
                            className="pdf-remove-quick-btn"
                            type="button"
                            onClick={() => {
                              setPendingBands([]);
                              setActiveBandId(null);
                            }}
                          >
                            <X size={14} />
                            <span>Clear Selection</span>
                          </button>
                        </>
                      ) : (
                        <div style={{
                          padding: '0.65rem 0.75rem',
                          background: 'color-mix(in srgb, var(--primary) 8%, var(--tool-bg))',
                          border: '1px dashed var(--primary)',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          color: 'var(--text-main)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          lineHeight: 1.4
                        }}>
                          <Scissors size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                          <span>Drag on Page {activePage} to cut out section</span>
                        </div>
                      )}
                    </div>
                  )}

                  {activePageCutsCount > 0 && (
                    <div className="pdf-crop-sub-actions" style={{ marginTop: '0.75rem' }}>
                      <button
                        className="pdf-remove-quick-btn"
                        type="button"
                        onClick={undoActivePageEdit}
                      >
                        <Undo2 size={14} />
                        <span>Undo Last</span>
                      </button>
                      <button
                        className="pdf-remove-quick-btn"
                        type="button"
                        onClick={resetActivePage}
                      >
                        <RotateCcw size={14} />
                        <span>Reset Page</span>
                      </button>
                    </div>
                  )}
                </div>
              </aside>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default PdfWhitespaceCropPage;
