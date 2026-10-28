import React, { useEffect, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { PDFDocument, rgb } from 'pdf-lib';
import { ArrowDown, Download, FileText, Layers2, Plus, Trash2, Upload, ZoomIn, ZoomOut } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

const CombinedPdfPreview = ({ file }) => {
  const [pages, setPages] = useState([]);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(100);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const original = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
        const ordered = Array.from({ length: original.numPages }, (_, index) => index + 1);
        setPages(ordered.map(pageNumber => ({ src: '', label: `Original page ${pageNumber}` })));
        setError('');
        for (const [index, pageNumber] of ordered.entries()) {
          if (cancelled) return;
          const page = await original.getPage(pageNumber);
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: Math.min(1.6, 1000 / base.width) });
          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          const src = canvas.toDataURL('image/jpeg', 0.94);
          setPages(current => current.map((preview, pageIndex) => pageIndex === index ? { ...preview, src } : preview));
        }
      } catch (err) { if (!cancelled) setError(err.message || 'Could not prepare the combined preview.'); }
    };
    load();
    return () => { cancelled = true; };
  }, [file]);
  return <div className="pdf-combined-preview">
    <div className="pdf-viewer-heading">
      <div><strong>PDF page preview</strong><span>Scroll through the original pages and choose pairs on the left.</span></div>
      <div className="pdf-preview-zoom">
        <button type="button" aria-label="Zoom out" title="Zoom out" disabled={zoom <= 50} onClick={() => setZoom(value => Math.max(50, value - 10))}><ZoomOut size={16} /></button>
        <span>{zoom}%</span>
        <button type="button" aria-label="Zoom in" title="Zoom in" disabled={zoom >= 200} onClick={() => setZoom(value => Math.min(200, value + 10))}><ZoomIn size={16} /></button>
      </div>
    </div>
    {error && <p className="reducer-error">{error}</p>}
    {pages.map((page, index) => <figure key={index}>{page.src ? <img src={page.src} alt={page.label} style={{ width: `${zoom}%` }} /> : <div className="pdf-preview-loading">Loading page preview…</div>}<figcaption>Page {index + 1}</figcaption></figure>)}
  </div>;
};

const renderPdfPage = async (pdfDocument, pageNumber) => {
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
  const png = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!png) throw new Error(`Could not prepare page ${pageNumber}.`);
  return { bytes: await png.arrayBuffer(), width: viewport.width / scale, height: viewport.height / scale };
};

const PdfPageStackerPage = ({ theme, toggleTheme }) => {
  const [file, setFile] = useState(null);
  const [originalPageCount, setOriginalPageCount] = useState(0);
  const [pairs, setPairs] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const pageCount = originalPageCount;

  const handleFile = async (selected) => {
    const nextFile = selected?.[0];
    if (!nextFile) return;
    setFile(null);
    setOriginalPageCount(0);
    setPairs([]);
    setResult(null);
    setError('');
    try {
      const source = await PDFDocument.load(await nextFile.arrayBuffer(), { ignoreEncryption: true });
      const count = source.getPageCount();
      if (count < 2) throw new Error('Choose a PDF with at least two pages.');
      setFile(nextFile);
      setOriginalPageCount(count);
      setPairs([{ id: Date.now(), top: '1', bottom: '2' }]);
    } catch (err) {
      setError(err.message || 'Could not read this PDF. Please choose a valid, unprotected PDF.');
    }
  };

  const updatePair = (id, key, value) => {
    setPairs(current => current.map(pair => pair.id === id ? { ...pair, [key]: value } : pair));
    setResult(null);
  };

  const addPair = () => {
    setPairs(current => {
      const used = new Set(current.flatMap(pair => [Number(pair.top), Number(pair.bottom)]));
      let top = 1;
      while (used.has(top) && top <= pageCount) top += 1;
      let bottom = top + 1;
      while (used.has(bottom) && bottom <= pageCount) bottom += 1;
      if (top > pageCount || bottom > pageCount) {
        top = 1;
        bottom = 2;
      }
      return [...current, { id: Date.now() + Math.random(), top: String(top), bottom: String(bottom) }];
    });
    setResult(null);
  };

  const stackPages = async () => {
    if (!file || !pairs.length) return;
    const indices = pairs.map((pair) => [Number(pair.top) - 1, Number(pair.bottom) - 1]);
    const invalid = indices.some(([top, bottom]) => !Number.isInteger(top) || !Number.isInteger(bottom)
      || top < 0 || bottom < 0 || top >= pageCount || bottom >= pageCount || top === bottom);
    if (invalid) {
      setError(`Each pair needs two different page numbers from 1 to ${pageCount}.`);
      return;
    }
    const selectedIndices = indices.flat();
    if (new Set(selectedIndices).size !== selectedIndices.length) {
      setError('A page can only be used in one pair. Remove the duplicate page selection.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setResult(null);
    try {
      const sourceBytes = await file.arrayBuffer();
      const original = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
      const renderedPdf = await pdfjs.getDocument({ data: new Uint8Array(sourceBytes).slice() }).promise;
      const output = await PDFDocument.create();
      const orderedPages = Array.from({ length: originalPageCount }, (_, index) => ({ pageNumber: index + 1 }));
      // Map: topIndex → bottomIndex for quick lookup
      const topToBottom = new Map();
      const bottomPages = new Set();
      indices.forEach(([topIndex, bottomIndex]) => {
        topToBottom.set(topIndex, bottomIndex);
        bottomPages.add(bottomIndex);
      });

      // Walk through every page in order
      for (let pageIndex = 0; pageIndex < orderedPages.length; pageIndex += 1) {
        const entry = orderedPages[pageIndex];
        if (topToBottom.has(pageIndex)) {
          // This page is the top of a pair → create a stacked page
          const bottomIndex = topToBottom.get(pageIndex);

          // Load separate source documents for each page to avoid
          // XObject resource conflicts when embedding from the same PDF
          const renderEntry = (pageEntry) => renderPdfPage(renderedPdf, pageEntry.pageNumber);
          const topImage = await renderEntry(entry);
          const bottomImage = await renderEntry(orderedPages[bottomIndex]);
          const topEmbed = await output.embedPng(topImage.bytes);
          const bottomEmbed = await output.embedPng(bottomImage.bytes);

          const gap = 12;
          const targetWidth = Math.max(topImage.width, bottomImage.width);
          const topHeight = topImage.height * (targetWidth / topImage.width);
          const bottomHeight = bottomImage.height * (targetWidth / bottomImage.width);
          const totalHeight = topHeight + gap + bottomHeight;
          const page = output.addPage([targetWidth, totalHeight]);

          // Draw top page in the upper portion (no scaling needed for same-width pages)
          page.drawImage(topEmbed, {
            x: 0,
            y: bottomHeight + gap,
            width: targetWidth,
            height: topHeight,
          });

          // Draw bottom page in the lower portion
          page.drawImage(bottomEmbed, {
            x: 0,
            y: 0,
            width: targetWidth,
            height: bottomHeight,
          });
          page.drawRectangle({
            x: 0,
            y: bottomHeight,
            width: targetWidth,
            height: gap,
            color: rgb(0.12, 0.12, 0.12),
          });
        } else if (bottomPages.has(pageIndex)) {
          // This page is the bottom of a pair → already included in its stacked page, skip
          continue;
        } else {
          // Unpaired page → copy as-is
          const [originalPage] = await output.copyPages(original, [entry.pageNumber - 1]);
          output.addPage(originalPage);
        }
      }
      setResult(new Blob([await output.save()], { type: 'application/pdf' }));
    } catch (err) {
      console.error('PDF stacking error:', err);
      setError(err.message || 'Could not stack these pages.');
    } finally {
      setIsProcessing(false);
    }
  };

  const download = () => {
    if (!result) return;
    const url = URL.createObjectURL(result);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${file?.name.replace(/\.pdf$/i, '') || 'document'}-stacked.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const pageOptions = Array.from({ length: pageCount }, (_, index) => index + 1);

  return (
    <div className="app-container reducer-page pdf-stacker-page">
      <Navbar onHome={() => {}} theme={theme} toggleTheme={toggleTheme} hideEditorControls={true} />
      <main className="reducer-shell">
        <section className="reducer-workspace">
          <div className="reducer-heading">
            <div><p>PDF Page Tool</p><h1>Stack two pages on one</h1></div>
            <Layers2 size={34} />
          </div>
          <p className="pdf-stacker-intro">Preview the original PDF and stack selected page pairs top to bottom. Download the complete PDF with every other page retained.</p>
          <div className={`reducer-grid merger-grid pdf-stacker-grid ${file ? 'has-file' : 'no-file'}`}>
            <div className="reducer-panel pdf-stack-toolbar">
              <label className="reducer-upload">
                <Upload size={24} />
                <strong>{file ? file.name : 'Choose a PDF'}</strong>
                <span>{file ? `${pageCount} pages loaded` : 'Select a PDF with at least two pages'}</span>
                <input type="file" accept="application/pdf,.pdf" onChange={(event) => handleFile(event.target.files)} />
              </label>
              {file && <>
                <div className="pdf-pair-heading"><strong>Page pairs</strong><span>{pairs.length} output page{pairs.length === 1 ? '' : 's'}</span></div>
                <button className="pdf-add-pair" type="button" onClick={addPair}><Plus size={17} /> Add another pair</button>
                <div className="pdf-pair-list">
                  {pairs.map((pair, index) => (
                    <div className="pdf-pair-card" key={pair.id}>
                      <div className="pdf-pair-title"><strong>Pair {index + 1}</strong>
                        {pairs.length > 1 && <button className="icon-btn" type="button" title="Remove pair" onClick={() => { setPairs(items => items.filter(item => item.id !== pair.id)); setResult(null); }}><Trash2 size={16} /></button>}
                      </div>
                      <label>Top page<select value={pair.top} onChange={(event) => updatePair(pair.id, 'top', event.target.value)}>{pageOptions.map(number => <option key={number} value={number}>{number}</option>)}</select></label>
                      <div className="pdf-pair-arrow"><ArrowDown size={16} /></div>
                      <label>Bottom page<select value={pair.bottom} onChange={(event) => updatePair(pair.id, 'bottom', event.target.value)}>{pageOptions.map(number => <option key={number} value={number}>{number}</option>)}</select></label>
                    </div>
                  ))}
                </div>
                <button className="btn-primary reducer-action" onClick={stackPages} disabled={!file || isProcessing}>
                  <Layers2 size={16} /><span>{isProcessing ? 'Stacking...' : `Stack PDF (${pairs.length})`}</span>
                </button>
              </>}
              {error && <p className="reducer-error">{error}</p>}
            </div>
            {file && <div className="reducer-panel pdf-stacker-viewer-panel">
              <>
                <CombinedPdfPreview file={file} />
                <div className="pdf-pair-live-preview">
                  <div><FileText size={16} /><span>Top: page {pairs[0]?.top}</span></div>
                  <ArrowDown size={16} />
                  <div><FileText size={16} /><span>Bottom: page {pairs[0]?.bottom}</span></div>
                </div>
                {result && <button className="btn-primary reducer-action pdf-stack-download" onClick={download} disabled={isProcessing}><Download size={18} /><span>Download full stacked PDF</span></button>}
              </>
            </div>}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default PdfPageStackerPage;
