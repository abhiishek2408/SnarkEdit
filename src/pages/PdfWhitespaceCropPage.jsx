import React, { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { Crop, Download, FileText, RotateCcw, Upload } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

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

const removeBandsFromCanvas = (source, bands) => {
  const merged = mergeBands(bands);
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

const PdfPreviewPage = ({ pdfDocument, pageNumber, edit, onApply, onReset }) => {
  const [selection, setSelection] = useState(edit?.previewRect || null);
  const [viewMode, setViewMode] = useState(edit ? 'result' : 'source');
  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const itemRef = useRef(null);
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const viewportRef = useRef(null);
  const dragActionRef = useRef(null);
  const renderTaskRef = useRef(null);

  useEffect(() => {
    if (!edit) setViewMode('source');
  }, [edit]);

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
    }, { rootMargin: '300px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return undefined;
    let cancelled = false;
    const render = async () => {
      try {
        const page = await pdfDocument.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(1.1, 680 / baseViewport.width) });
        viewportRef.current = viewport;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        wrapRef.current.style.width = `${viewport.width}px`;
        canvas.width = Math.ceil(viewport.width * pixelRatio);
        canvas.height = Math.ceil(viewport.height * pixelRatio);
        const task = page.render({
          canvasContext: context,
          viewport,
          transform: pixelRatio === 1 ? null : [pixelRatio, 0, 0, pixelRatio, 0, 0],
        });
        renderTaskRef.current = task;
        await task.promise;
        if (!cancelled) setIsRendered(true);
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException' && !cancelled) console.error(`Could not render PDF page ${pageNumber}`, err);
      }
    };
    render();
    return () => { cancelled = true; renderTaskRef.current?.cancel(); };
  }, [pdfDocument, pageNumber, isVisible]);

  const pointFromEvent = (event) => {
    const bounds = wrapRef.current?.getBoundingClientRect();
    if (!bounds) return null;
    return {
      x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
      y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
    };
  };

  const startSelection = (event) => {
    const point = pointFromEvent(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const edge = event.target.closest('[data-resize-edge]')?.dataset.resizeEdge;
    const isInsideSelection = event.target.closest('.pdf-crop-selection');
    if (edge && selection) {
      dragActionRef.current = { mode: 'resize', edge, start: point, original: selection };
    } else if (isInsideSelection && selection) {
      dragActionRef.current = { mode: 'move', start: point, original: selection };
    } else {
      dragActionRef.current = { mode: 'draw', start: point };
      setSelection({ x: point.x, y: point.y, width: 0, height: 0 });
    }
  };

  const moveSelection = (event) => {
    if (!dragActionRef.current) return;
    const point = pointFromEvent(event);
    if (!point) return;
    const action = dragActionRef.current;
    const dx = point.x - action.start.x;
    const dy = point.y - action.start.y;
    if (action.mode === 'draw') {
      setSelection({ x: Math.min(action.start.x, point.x), y: Math.min(action.start.y, point.y), width: Math.abs(dx), height: Math.abs(dy) });
      return;
    }
    const original = action.original;
    if (action.mode === 'move') {
      setSelection({
        ...original,
        x: Math.max(0, Math.min(1 - original.width, original.x + dx)),
        y: Math.max(0, Math.min(1 - original.height, original.y + dy)),
      });
      return;
    }
    let left = original.x;
    let right = original.x + original.width;
    let top = original.y;
    let bottom = original.y + original.height;
    if (action.edge.includes('w')) left = Math.max(0, Math.min(right - 0.02, left + dx));
    if (action.edge.includes('e')) right = Math.min(1, Math.max(left + 0.02, right + dx));
    if (action.edge.includes('n')) top = Math.max(0, Math.min(bottom - 0.02, top + dy));
    if (action.edge.includes('s')) bottom = Math.min(1, Math.max(top + 0.02, bottom + dy));
    setSelection({ x: left, y: top, width: right - left, height: bottom - top });
  };

  const applySelection = () => {
    if (!selection || selection.width < 0.85 || selection.height < 0.02) return;
    if (selection.x > 0.08 || selection.x + selection.width < 0.92) return;
    const sourceCanvas = canvasRef.current;
    const bands = [...(edit?.bands || []), { y: selection.y, height: selection.height }];
    const previewCanvas = removeBandsFromCanvas(sourceCanvas, bands);
    onApply(pageNumber, {
      bands,
      previewData: previewCanvas.toDataURL('image/png'),
    });
    setSelection(null);
    setViewMode('result');
  };

  const undoLastBand = () => {
    const bands = edit.bands.slice(0, -1);
    if (!bands.length) {
      onReset(pageNumber);
      return;
    }
    const previewCanvas = removeBandsFromCanvas(canvasRef.current, bands);
    onApply(pageNumber, { bands, previewData: previewCanvas.toDataURL('image/png') });
    setSelection(null);
    setViewMode('result');
  };

  return (
    <article className="pdf-all-pages-item" ref={itemRef}>
      <div className="pdf-all-pages-heading">
        <strong>Page {pageNumber}</strong>
        {edit && viewMode === 'result' ? <span className="pdf-page-removed-status">{edit.bands.length} whitespace band{edit.bands.length === 1 ? '' : 's'} removed</span> : <span>Drag across a blank band</span>}
      </div>
      <div className="pdf-crop-canvas-wrap" ref={wrapRef}>
        <canvas ref={canvasRef} style={{ display: viewMode === 'source' ? 'block' : 'none' }} />
        {viewMode === 'result' && edit?.previewData && <img className="pdf-page-edited-preview" src={edit.previewData} alt={`Page ${pageNumber} with whitespace removed`} />}
        <div className="pdf-crop-selection-layer" style={{ display: viewMode === 'source' ? 'block' : 'none', pointerEvents: isRendered ? 'auto' : 'none' }} onPointerDown={startSelection} onPointerMove={moveSelection} onPointerUp={() => { dragActionRef.current = null; }} onPointerCancel={() => { dragActionRef.current = null; }}>
          {edit?.bands.map((band, index) => <div key={index} className="pdf-crop-applied-band" style={{ top: `${band.y * 100}%`, height: `${band.height * 100}%` }} />)}
          {selection && <div className="pdf-crop-selection" style={{ left: `${selection.x * 100}%`, top: `${selection.y * 100}%`, width: `${selection.width * 100}%`, height: `${selection.height * 100}%` }}>
            {['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map(edge => <span key={edge} className={`pdf-crop-handle handle-${edge}`} data-resize-edge={edge} />)}
          </div>}
        </div>
      </div>
      <div className="pdf-all-pages-actions">
        {edit && viewMode === 'result' && <button className="btn-primary" type="button" onClick={() => setViewMode('source')}><Crop size={16} /><span>Select another band</span></button>}
        {viewMode === 'source' && <button className="btn-primary" type="button" onClick={applySelection} disabled={!isRendered || !selection || selection.width < 0.85 || selection.height < 0.02 || selection.x > 0.08 || selection.x + selection.width < 0.92}><Crop size={16} /><span>Add whitespace removal</span></button>}
        {viewMode === 'source' && edit?.bands.length > 0 && <><button className="pdf-clear-crop" type="button" onClick={undoLastBand}><RotateCcw size={15} /> Undo last</button><button className="pdf-clear-crop" type="button" onClick={() => { setViewMode('source'); setSelection(null); onReset(pageNumber); }}>Reset page</button></>}
        {viewMode === 'source' && <span className="pdf-band-help">Select a blank horizontal band across nearly the full page width. Drag the edges to resize.</span>}
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
      const [document] = await Promise.all([
        pdfjs.getDocument({ data: data.slice() }).promise,
        PDFDocument.load(data.slice(), { ignoreEncryption: true }),
      ]);
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

  const resetPage = (pageNumber) => {
    setPageEdits(current => {
      const next = { ...current };
      delete next[pageNumber];
      return next;
    });
  };

  const download = async () => {
    if (!file || !Object.keys(pageEdits).length) return;
    setIsExporting(true);
    setError('');
    try {
      const original = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      const output = await PDFDocument.create();
      for (let index = 0; index < pageCount; index += 1) {
        const edit = pageEdits[index + 1];
        if (!edit) {
          const [page] = await output.copyPages(original, [index]);
          output.addPage(page);
          continue;
        }

        const sourcePage = await pdfDocument.getPage(index + 1);
        const baseViewport = sourcePage.getViewport({ scale: 1 });
        const scale = Math.min(2, 4000 / baseViewport.width, 6000 / baseViewport.height);
        const viewport = sourcePage.getViewport({ scale });
        const sourceCanvas = window.document.createElement('canvas');
        sourceCanvas.width = Math.ceil(viewport.width);
        sourceCanvas.height = Math.ceil(viewport.height);
        await sourcePage.render({ canvasContext: sourceCanvas.getContext('2d'), viewport }).promise;

        const resultCanvas = removeBandsFromCanvas(sourceCanvas, edit.bands);
        const png = await new Promise(resolve => resultCanvas.toBlob(resolve, 'image/png'));
        if (!png) throw new Error(`Could not prepare edited page ${index + 1}.`);
        const image = await output.embedPng(await png.arrayBuffer());
        const pageWidth = resultCanvas.width / scale;
        const pageHeight = resultCanvas.height / scale;
        const outputPage = output.addPage([pageWidth, pageHeight]);
        outputPage.drawImage(image, { x: 0, y: 0, width: pageWidth, height: pageHeight });
      }
      const blob = new Blob([await output.save()], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = `${file.name.replace(/\.pdf$/i, '')}-edited.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Could not export the edited PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const editedCount = Object.keys(pageEdits).length;

  return (
    <div className="app-container reducer-page">
      <Navbar onHome={() => {}} theme={theme} toggleTheme={toggleTheme} hideEditorControls={true} />
      <main className="reducer-shell">
        <section className="reducer-workspace">
          <div className="reducer-heading"><div><p>PDF Page Tool</p><h1>Remove selected areas</h1></div><Crop size={34} /></div>
          <p className="pdf-stacker-intro">Scroll through every page. Select a blank horizontal band across the page; removing it pulls the content below upward. Repeat on other pages.</p>
          <div className="pdf-crop-layout">
            <section className="reducer-panel pdf-crop-controls">
              <label className="reducer-upload">
                <Upload size={24} />
                <strong>{file ? file.name : 'Choose a PDF'}</strong>
                <span>{file ? `${pageCount} pages loaded` : 'Select the PDF you want to edit'}</span>
                <input type="file" accept="application/pdf,.pdf" onChange={(event) => handleFile(event.target.files)} />
              </label>
              {file && <>
                <div className="pdf-crop-count">{editedCount} of {pageCount} pages edited</div>
                <button className="btn-primary reducer-action" type="button" onClick={download} disabled={!editedCount || isExporting}>
                  <Download size={18} /><span>{isExporting ? 'Preparing PDF...' : 'Download full PDF'}</span>
                </button>
              </>}
              {error && <p className="reducer-error">{error}</p>}
            </section>
            <section className="reducer-panel pdf-crop-preview-panel">
              {pdfDocument ? <div className="pdf-all-pages-list">
                {Array.from({ length: pageCount }, (_, index) => {
                  const pageNumber = index + 1;
                  return <PdfPreviewPage key={pageNumber} pdfDocument={pdfDocument} pageNumber={pageNumber} edit={pageEdits[pageNumber]} onApply={savePageEdit} onReset={resetPage} />;
                })}
              </div> : <div className="reducer-empty"><FileText size={44} /><p>Upload a PDF to preview all its pages here.</p></div>}
            </section>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default PdfWhitespaceCropPage;
