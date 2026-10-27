import React, { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { ArrowDown, Download, FileText, Layers2, Plus, RotateCcw, Scissors, Trash2, Upload } from 'lucide-react';
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
    } else merged.push({ ...band });
    return merged;
  }, []);

const renderEditedPage = async (pdfDocument, pageNumber, bands = []) => {
  const sourcePage = await pdfDocument.getPage(pageNumber);
  const baseViewport = sourcePage.getViewport({ scale: 1 });
  const scale = Math.min(2, 3600 / baseViewport.width, 5000 / baseViewport.height);
  const viewport = sourcePage.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  await sourcePage.render({ canvasContext: context, viewport }).promise;

  const intervals = mergeBands(bands).map((band) => ({
    start: Math.max(0, Math.min(canvas.height - 1, Math.round(band.y * canvas.height))),
    end: Math.max(1, Math.min(canvas.height, Math.round((band.y + band.height) * canvas.height))),
  }));
  const removedHeight = intervals.reduce((total, interval) => total + interval.end - interval.start, 0);
  const resultCanvas = document.createElement('canvas');
  resultCanvas.width = canvas.width;
  resultCanvas.height = Math.max(1, canvas.height - Math.min(removedHeight, canvas.height - 1));
  const resultContext = resultCanvas.getContext('2d');
  let sourceY = 0;
  let targetY = 0;
  intervals.forEach(({ start, end }) => {
    if (start > sourceY) {
      const height = start - sourceY;
      resultContext.drawImage(canvas, 0, sourceY, canvas.width, height, 0, targetY, canvas.width, height);
      targetY += height;
    }
    sourceY = Math.max(sourceY, end);
  });
  if (sourceY < canvas.height) {
    resultContext.drawImage(canvas, 0, sourceY, canvas.width, canvas.height - sourceY, 0, targetY, canvas.width, canvas.height - sourceY);
  }
  const png = await new Promise(resolve => resultCanvas.toBlob(resolve, 'image/png'));
  if (!png) throw new Error(`Could not prepare page ${pageNumber}.`);
  return { bytes: await png.arrayBuffer(), width: viewport.width / scale, height: resultCanvas.height / scale };
};

const PagePreview = ({ pdfDocument, pageNumber, bands, onAddBand, onUndoBand, onClearBands }) => {
  const [selection, setSelection] = useState(null);
  const [visible, setVisible] = useState(false);
  const [rendered, setRendered] = useState(false);
  const itemRef = useRef(null);
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    const node = itemRef.current;
    if (!node || !('IntersectionObserver' in window)) {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '300px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    let cancelled = false;
    let task;
    const render = async () => {
      try {
        const page = await pdfDocument.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: Math.min(1.1, 680 / baseViewport.width) });
        const canvas = canvasRef.current;
        if (!canvas) return;
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        wrapRef.current.style.width = `${viewport.width}px`;
        canvas.width = Math.ceil(viewport.width * pixelRatio);
        canvas.height = Math.ceil(viewport.height * pixelRatio);
        const context = canvas.getContext('2d');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        task = page.render({ canvasContext: context, viewport, transform: pixelRatio === 1 ? null : [pixelRatio, 0, 0, pixelRatio, 0, 0] });
        await task.promise;
        if (!cancelled) setRendered(true);
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException' && !cancelled) console.error(`Could not render page ${pageNumber}`, err);
      }
    };
    render();
    return () => { cancelled = true; task?.cancel(); };
  }, [pdfDocument, pageNumber, visible]);

  const pointFromEvent = (event) => {
    const bounds = wrapRef.current?.getBoundingClientRect();
    if (!bounds) return null;
    return {
      x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
      y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
    };
  };

  const startDrag = (event) => {
    const point = pointFromEvent(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const edge = event.target.closest('[data-edge]')?.dataset.edge;
    const inside = event.target.closest('.pdf-crop-selection');
    if (edge && selection) dragRef.current = { mode: 'resize', edge, start: point, original: selection };
    else if (inside && selection) dragRef.current = { mode: 'move', start: point, original: selection };
    else {
      dragRef.current = { mode: 'draw', start: point };
      setSelection({ x: point.x, y: point.y, width: 0, height: 0 });
    }
  };

  const moveDrag = (event) => {
    if (!dragRef.current) return;
    const point = pointFromEvent(event);
    if (!point) return;
    const drag = dragRef.current;
    const dx = point.x - drag.start.x;
    const dy = point.y - drag.start.y;
    if (drag.mode === 'draw') {
      setSelection({ x: Math.min(drag.start.x, point.x), y: Math.min(drag.start.y, point.y), width: Math.abs(dx), height: Math.abs(dy) });
      return;
    }
    const original = drag.original;
    if (drag.mode === 'move') {
      setSelection({ ...original, y: Math.max(0, Math.min(1 - original.height, original.y + dy)) });
      return;
    }
    let top = original.y;
    let bottom = original.y + original.height;
    if (drag.edge === 'n') top = Math.max(0, Math.min(bottom - 0.02, top + dy));
    if (drag.edge === 's') bottom = Math.min(1, Math.max(top + 0.02, bottom + dy));
    setSelection({ ...original, y: top, height: bottom - top });
  };

  const addSelection = () => {
    if (!selection || selection.width < 0.85 || selection.height < 0.02) return;
    onAddBand(pageNumber, { y: selection.y, height: selection.height });
    setSelection(null);
  };

  return (
    <article className="pdf-all-pages-item" ref={itemRef}>
      <div className="pdf-all-pages-heading"><strong>Page {pageNumber}</strong><span>{bands.length ? `${bands.length} whitespace band${bands.length === 1 ? '' : 's'} removed` : 'Drag across a blank band'}</span></div>
      <div className="pdf-crop-canvas-wrap" ref={wrapRef}>
        <canvas ref={canvasRef} />
        <div className="pdf-crop-selection-layer" style={{ pointerEvents: rendered ? 'auto' : 'none' }} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={() => { dragRef.current = null; }} onPointerCancel={() => { dragRef.current = null; }}>
          {bands.map((band, index) => <div key={index} className="pdf-crop-applied-band" style={{ top: `${band.y * 100}%`, height: `${band.height * 100}%` }} />)}
          {selection && <div className="pdf-crop-selection" style={{ left: `${selection.x * 100}%`, top: `${selection.y * 100}%`, width: `${selection.width * 100}%`, height: `${selection.height * 100}%` }}>
            <span className="pdf-crop-handle handle-n" data-edge="n" />
            <span className="pdf-crop-handle handle-s" data-edge="s" />
          </div>}
        </div>
      </div>
      <div className="pdf-all-pages-actions">
        <button className="btn-primary" type="button" onClick={addSelection} disabled={!rendered || !selection || selection.x > 0.08 || selection.x + selection.width < 0.92 || selection.width < 0.85 || selection.height < 0.02}><Scissors size={16} /><span>Add crop band</span></button>
        {!!bands.length && <><button className="pdf-clear-crop" type="button" onClick={() => onUndoBand(pageNumber)}><RotateCcw size={15} /> Undo band</button><button className="pdf-clear-crop" type="button" onClick={() => onClearBands(pageNumber)}>Clear page cuts</button></>}
        <span className="pdf-band-help">Select a blank band across the page width. Drag its top or bottom edge to resize.</span>
      </div>
    </article>
  );
};

const EditPdfPage = ({ theme, toggleTheme }) => {
  const [file, setFile] = useState(null);
  const [pdfDocument, setPdfDocument] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [pairs, setPairs] = useState([]);
  const [pageBands, setPageBands] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = async (files) => {
    const nextFile = files?.[0];
    if (!nextFile) return;
    setFile(null);
    setPdfDocument(null);
    setPageCount(0);
    setPairs([]);
    setPageBands({});
    setResult(null);
    setError('');
    try {
      const bytes = new Uint8Array(await nextFile.arrayBuffer());
      const [pdf] = await Promise.all([
        pdfjs.getDocument({ data: bytes.slice() }).promise,
        PDFDocument.load(bytes.slice(), { ignoreEncryption: true }),
      ]);
      setFile(nextFile);
      setPdfDocument(pdf);
      setPageCount(pdf.numPages);
      if (pdf.numPages > 1) setPairs([{ id: Date.now(), top: '1', bottom: '2' }]);
    } catch (err) {
      setError(err.message || 'Could not open this PDF. Try a valid, unprotected PDF.');
    }
  };

  const addPair = () => {
    setPairs(current => {
      const used = new Set(current.flatMap(pair => [Number(pair.top), Number(pair.bottom)]));
      if (used.size + 2 > pageCount) return current;
      let top = 1;
      while (used.has(top) && top <= pageCount) top += 1;
      let bottom = top + 1;
      while (used.has(bottom) && bottom <= pageCount) bottom += 1;
      if (top > pageCount || bottom > pageCount) { top = 1; bottom = 2; }
      return [...current, { id: Date.now() + Math.random(), top: String(top), bottom: String(bottom) }];
    });
    setResult(null);
  };

  const updatePair = (id, key, value) => {
    setPairs(current => current.map(pair => pair.id === id ? { ...pair, [key]: value } : pair));
    setResult(null);
  };

  const addBand = (pageNumber, band) => {
    setPageBands(current => ({ ...current, [pageNumber]: [...(current[pageNumber] || []), band] }));
    setResult(null);
  };

  const undoBand = (pageNumber) => {
    setPageBands(current => ({ ...current, [pageNumber]: current[pageNumber].slice(0, -1) }));
    setResult(null);
  };

  const clearBands = (pageNumber) => {
    setPageBands(current => ({ ...current, [pageNumber]: [] }));
    setResult(null);
  };

  const createEditedPdf = async () => {
    if (!file || !pdfDocument) return;
    const indices = pairs.map(pair => [Number(pair.top) - 1, Number(pair.bottom) - 1]);
    const invalid = indices.some(([top, bottom]) => !Number.isInteger(top) || !Number.isInteger(bottom) || top < 0 || bottom < 0 || top >= pageCount || bottom >= pageCount || top === bottom);
    if (invalid) { setError(`Each pair needs two different pages from 1 to ${pageCount}.`); return; }
    if (new Set(indices.flat()).size !== indices.flat().length) { setError('A page can only be used in one pair. Remove the duplicate page selection.'); return; }

    setIsProcessing(true);
    setError('');
    setResult(null);
    try {
      const original = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      const output = await PDFDocument.create();
      const pairAtIndex = new Map();
      const pairedPages = new Set();
      indices.forEach(([topIndex, bottomIndex]) => {
        pairAtIndex.set(Math.min(topIndex, bottomIndex), { topIndex, bottomIndex });
        pairedPages.add(topIndex);
        pairedPages.add(bottomIndex);
      });

      for (let index = 0; index < pageCount; index += 1) {
        const pair = pairAtIndex.get(index);
        if (pair) {
          const top = await renderEditedPage(pdfDocument, pair.topIndex + 1, pageBands[pair.topIndex + 1]);
          const bottom = await renderEditedPage(pdfDocument, pair.bottomIndex + 1, pageBands[pair.bottomIndex + 1]);
          const topImage = await output.embedPng(top.bytes);
          const bottomImage = await output.embedPng(bottom.bytes);
          const width = Math.max(top.width, bottom.width);
          const topHeight = top.height * width / top.width;
          const bottomHeight = bottom.height * width / bottom.width;
          const gap = 12;
          const page = output.addPage([width, topHeight + gap + bottomHeight]);
          page.drawImage(topImage, { x: 0, y: bottomHeight + gap, width, height: topHeight });
          page.drawImage(bottomImage, { x: 0, y: 0, width, height: bottomHeight });
          continue;
        }
        if (pairedPages.has(index)) continue;
        const bands = pageBands[index + 1] || [];
        if (bands.length) {
          const edited = await renderEditedPage(pdfDocument, index + 1, bands);
          const image = await output.embedPng(edited.bytes);
          const page = output.addPage([edited.width, edited.height]);
          page.drawImage(image, { x: 0, y: 0, width: edited.width, height: edited.height });
        } else {
          const [page] = await output.copyPages(original, [index]);
          output.addPage(page);
        }
      }
      setResult(new Blob([await output.save()], { type: 'application/pdf' }));
    } catch (err) {
      setError(err.message || 'Could not apply the selected PDF edits.');
    } finally {
      setIsProcessing(false);
    }
  };

  const download = () => {
    if (!result) return;
    const url = URL.createObjectURL(result);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${file?.name.replace(/\.pdf$/i, '') || 'document'}-edited.pdf`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const pageOptions = Array.from({ length: pageCount }, (_, index) => index + 1);
  const cutPageCount = Object.values(pageBands).filter(bands => bands.length > 0).length;

  return (
    <div className="app-container reducer-page">
      <Navbar onHome={() => {}} theme={theme} toggleTheme={toggleTheme} hideEditorControls={true} />
      <main className="reducer-shell">
        <section className="reducer-workspace">
          <div className="reducer-heading"><div><p>PDF Editor</p><h1>Stack and crop pages</h1></div><Layers2 size={34} /></div>
          <p className="pdf-stacker-intro">Upload one PDF, choose page pairs to stack, and mark whitespace bands on any page. Both edits are included in one full-PDF download.</p>
          <div className="reducer-grid merger-grid pdf-stacker-grid">
            <section className="reducer-panel">
              <label className="reducer-upload"><Upload size={24} /><strong>{file ? file.name : 'Choose a PDF'}</strong><span>{file ? `${pageCount} pages loaded` : 'Select a PDF to edit'}</span><input type="file" accept="application/pdf,.pdf" onChange={(event) => handleFile(event.target.files)} /></label>
              {file && <>
                <div className="pdf-pair-heading"><strong>Stack page pairs</strong><span>{pairs.length} pair{pairs.length === 1 ? '' : 's'}</span></div>
                {pageCount > 1 && <button className="pdf-add-pair" type="button" onClick={addPair} disabled={pairs.reduce((sum, pair) => sum + (Number(pair.top) !== Number(pair.bottom) ? 2 : 0), 0) + 2 > pageCount}><Plus size={17} /> Add another pair</button>}
                <div className="pdf-pair-list">
                  {pairs.map((pair, index) => <div className="pdf-pair-card" key={pair.id}>
                    <div className="pdf-pair-title"><strong>Pair {index + 1}</strong>{pairs.length > 1 && <button className="icon-btn" type="button" title="Remove pair" onClick={() => { setPairs(items => items.filter(item => item.id !== pair.id)); setResult(null); }}><Trash2 size={16} /></button>}</div>
                    <label>Top page<select value={pair.top} onChange={(event) => updatePair(pair.id, 'top', event.target.value)}>{pageOptions.map(number => <option key={number} value={number}>{number}</option>)}</select></label>
                    <div className="pdf-pair-arrow"><ArrowDown size={16} /></div>
                    <label>Bottom page<select value={pair.bottom} onChange={(event) => updatePair(pair.id, 'bottom', event.target.value)}>{pageOptions.map(number => <option key={number} value={number}>{number}</option>)}</select></label>
                  </div>)}
                </div>
                <div className="pdf-crop-count">Whitespace cuts on {cutPageCount} page{cutPageCount === 1 ? '' : 's'}</div>
                <button className="btn-primary reducer-action" type="button" onClick={createEditedPdf} disabled={isProcessing}><Layers2 size={18} /><span>{isProcessing ? 'Applying both edits...' : 'Create edited full PDF'}</span></button>
                {result && <button className="btn-primary reducer-action" type="button" onClick={download}><Download size={18} /><span>Download edited PDF</span></button>}
              </>}
              {error && <p className="reducer-error">{error}</p>}
            </section>
            <section className="reducer-panel pdf-crop-preview-panel">
              {pdfDocument ? <div className="pdf-all-pages-list">
                {pageOptions.map(pageNumber => <PagePreview key={pageNumber} pdfDocument={pdfDocument} pageNumber={pageNumber} bands={pageBands[pageNumber] || []} onAddBand={addBand} onUndoBand={undoBand} onClearBands={clearBands} />)}
              </div> : <div className="reducer-empty"><FileText size={44} /><p>Upload a PDF to preview all its pages.</p></div>}
            </section>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default EditPdfPage;
