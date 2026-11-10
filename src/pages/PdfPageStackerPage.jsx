import React, { useEffect, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument, rgb } from 'pdf-lib';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import { ArrowDown, Download, FileText, Layers2, Plus, Upload, ZoomIn, ZoomOut } from 'lucide-react';
import Navbar from '../components/Navbar';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

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
          const viewport = page.getViewport({ scale: Math.min(1.5, Math.max(1, 800 / base.width)) });
          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport }).promise;
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
    <div className="pdf-combined-preview-stage">
      {pages.map((page, index) => (
        <figure key={index}>
          {page.src ? (
            <img src={page.src} alt={page.label} style={{ width: `${zoom}%` }} />
          ) : (
            <div className="pdf-preview-loading">Loading page preview…</div>
          )}
          <figcaption>Page {index + 1}</figcaption>
        </figure>
      ))}
    </div>
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

          // Fill page with clean white background so the divider gap is white
          page.drawRectangle({
            x: 0,
            y: 0,
            width: targetWidth,
            height: totalHeight,
            color: rgb(1, 1, 1),
          });

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
    <div className="app-container reducer-page pdf-tool-page pdf-stacker-page">
      <Navbar onHome={() => {}} theme={theme} toggleTheme={toggleTheme} hideEditorControls={true} />
      <main className="reducer-shell">
        <section className="reducer-workspace">
          {/* Header (shown only when no file is loaded) */}
          {!file && (
            <div className="reducer-heading">
              <div>
                <p>PDF Tools</p>
                <h1>Stack PDF Pages</h1>
              </div>
              <Layers2 size={34} className="desktop-only" />
            </div>
          )}

          {!file ? (
            <div className="pdf-merge-upload-hero">
              <p className="pdf-stacker-intro" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 1.5rem' }}>
                Stack selected page pairs top-to-bottom on a single page. Perfect for merging split scans or creating compact layouts.
              </p>
              <label className="pdf-merge-dropzone">
                <div className="pdf-merge-upload-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
                  <Upload size={32} />
                </div>
                <strong style={{ fontSize: '1.25rem' }}>Select PDF to Stack</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Drag & drop or click to browse
                </span>
                <input type="file" accept="application/pdf,.pdf" onChange={(event) => handleFile(event.target.files)} style={{ display: 'none' }} />
              </label>

              <div className="pdf-merge-features-badges">
                <div className="pdf-merge-badge-item">
                  <CheckCircle2 size={15} style={{ color: '#10b981' }} />
                  <span>2-on-1 Layouts</span>
                </div>
                <div className="pdf-merge-badge-item">
                  <Sparkles size={15} style={{ color: '#3b82f6' }} />
                  <span>Live Preview</span>
                </div>
                <div className="pdf-merge-badge-item">
                  <Layers2 size={15} style={{ color: '#3b82f6' }} />
                  <span>Custom Pairs</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="pdf-remove-workspace-layout">
              {/* Left Sidebar Controls */}
              <aside className="pdf-remove-sidebar">
                {/* File Info */}
                <div className="reducer-panel pdf-remove-card">
                  <div className="pdf-remove-file-header">
                    <div className="pdf-remove-file-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
                      <FileText size={20} />
                    </div>
                    <div className="pdf-remove-file-meta">
                      <strong title={file.name}>{file.name}</strong>
                      <span>{pageCount} pages loaded</span>
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

                {/* Stacking Controls */}
                <div className="reducer-panel pdf-remove-card">
                  <h3 className="pdf-remove-section-title">Page Pairs</h3>
                  <p className="pdf-remove-sub-desc">Choose which pages to stack together.</p>

                  <div className="pdf-pair-list" style={{ maxHeight: 'none' }}>
                    {pairs.map((pair, index) => (
                      <div className="pdf-pair-card" key={pair.id} style={{ padding: '0.85rem' }}>
                        <div className="pdf-pair-title" style={{ marginBottom: '0.5rem' }}>
                          <strong style={{ fontSize: '0.8rem' }}>Set #{index + 1}</strong>
                          {pairs.length > 1 && (
                            <button className="pdf-remove-quick-btn" style={{ padding: '4px', height: 'auto' }} type="button" onClick={() => { setPairs(items => items.filter(item => item.id !== pair.id)); setResult(null); }}>
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '0.5rem' }}>
                          <label style={{ fontSize: '0.7rem' }}>
                            Top
                            <select className="pdf-merge-name-input" style={{ marginTop: '0.2rem', padding: '4px' }} value={pair.top} onChange={(event) => updatePair(pair.id, 'top', event.target.value)}>
                              {pageOptions.map(number => <option key={number} value={number}>{number}</option>)}
                            </select>
                          </label>
                          <ArrowDown size={14} style={{ marginTop: '1rem', color: 'var(--text-muted)' }} />
                          <label style={{ fontSize: '0.7rem' }}>
                            Bottom
                            <select className="pdf-merge-name-input" style={{ marginTop: '0.2rem', padding: '4px' }} value={pair.bottom} onChange={(event) => updatePair(pair.id, 'bottom', event.target.value)}>
                              {pageOptions.map(number => <option key={number} value={number}>{number}</option>)}
                            </select>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button className="pdf-remove-quick-btn pdf-stacker-add-btn" type="button" onClick={addPair} style={{ borderStyle: 'dashed' }}>
                    <Plus size={15} />
                    <span>Add Another Pair</span>
                  </button>

                  <button
                    className="btn-primary pdf-stacker-action-btn"
                    onClick={stackPages}
                    disabled={!file || isProcessing}
                    style={{ marginTop: '0.5rem' }}
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw size={17} className="spin" />
                        <span>Stacking...</span>
                      </>
                    ) : (
                      <>
                        <Layers2 size={17} />
                        <span>Stack {pairs.length} Pairs</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Success Card */}
                {result && (
                  <div className="pdf-merge-success-card">
                    <div className="pdf-merge-success-header">
                      <CheckCircle2 size={20} color="#10b981" />
                      <div>
                        <strong>Stacking Ready!</strong>
                        <span>New PDF is generated</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-primary pdf-stacker-download-btn"
                      onClick={download}
                    >
                      <Download size={18} />
                      <span>Download Stacked PDF</span>
                    </button>
                  </div>
                )}

                {error && (
                  <div className="reducer-error pdf-remove-alert-box">
                    <AlertCircle size={15} />
                    <span>{error}</span>
                  </div>
                )}
              </aside>

              {/* Right Preview Workspace */}
              <section className="pdf-remove-gallery-panel">
                <CombinedPdfPreview file={file} />
              </section>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default PdfPageStackerPage;
