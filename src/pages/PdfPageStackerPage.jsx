import React, { useEffect, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import { ArrowDown, Crop, Download, ExternalLink, FileDown, FileText, Hash, Layers2, Plus, Stamp, Trash2, Undo2, Upload } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

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
  const [pdfUrl, setPdfUrl] = useState('');
  const [pageCount, setPageCount] = useState(0);
  const [pairs, setPairs] = useState([]);
  const [result, setResult] = useState(null);
  const [resultHistory, setResultHistory] = useState([]);
  const [activeEditor, setActiveEditor] = useState(null);
  const [cropMargins, setCropMargins] = useState({ top: 0, bottom: 0, left: 0, right: 0 });
  const [compressionQuality, setCompressionQuality] = useState(70);
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState(25);
  const [pageNumberPosition, setPageNumberPosition] = useState('bottom-center');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);

  const handleFile = async (selected) => {
    const nextFile = selected?.[0];
    if (!nextFile) return;
    setFile(null);
    setPageCount(0);
    setPairs([]);
    setResult(null);
    setResultHistory([]);
    setActiveEditor(null);
    setError('');
    try {
      const source = await PDFDocument.load(await nextFile.arrayBuffer(), { ignoreEncryption: true });
      const count = source.getPageCount();
      if (count < 2) throw new Error('Choose a PDF with at least two pages.');
      setFile(nextFile);
      setPageCount(count);
      setPairs([{ id: Date.now(), top: '1', bottom: '2' }]);
      setPdfUrl(URL.createObjectURL(nextFile));
    } catch (err) {
      setError(err.message || 'Could not read this PDF. Please choose a valid, unprotected PDF.');
    }
  };

  const updatePair = (id, key, value) => {
    setPairs(current => current.map(pair => pair.id === id ? { ...pair, [key]: value } : pair));
    setResult(null);
    setResultHistory([]);
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
    setResultHistory([]);
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
      // Map: topIndex → bottomIndex for quick lookup
      const topToBottom = new Map();
      const bottomPages = new Set();
      indices.forEach(([topIndex, bottomIndex]) => {
        topToBottom.set(topIndex, bottomIndex);
        bottomPages.add(bottomIndex);
      });

      // Walk through every page in order
      for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
        if (topToBottom.has(pageIndex)) {
          // This page is the top of a pair → create a stacked page
          const bottomIndex = topToBottom.get(pageIndex);

          // Load separate source documents for each page to avoid
          // XObject resource conflicts when embedding from the same PDF
          const topImage = await renderPdfPage(renderedPdf, pageIndex + 1);
          const bottomImage = await renderPdfPage(renderedPdf, bottomIndex + 1);
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
        } else if (bottomPages.has(pageIndex)) {
          // This page is the bottom of a pair → already included in its stacked page, skip
          continue;
        } else {
          // Unpaired page → copy as-is
          const [originalPage] = await output.copyPages(original, [pageIndex]);
          output.addPage(originalPage);
        }
      }
      setResult(new Blob([await output.save()], { type: 'application/pdf' }));
      setResultHistory([]);
      setActiveEditor(null);
    } catch (err) {
      console.error('PDF stacking error:', err);
      setError(err.message || 'Could not stack these pages.');
    } finally {
      setIsProcessing(false);
    }
  };

  const transformResult = async (operation) => {
    if (!result || isProcessing) return;
    setIsProcessing(true);
    setError('');
    try {
      const nextResult = await operation(result);
      setResultHistory(history => [...history, result]);
      setResult(nextResult);
      setActiveEditor(null);
    } catch (err) {
      setError(err.message || 'Could not update this PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const applyCrop = () => transformResult(async (sourceBlob) => {
    const margins = Object.fromEntries(Object.entries(cropMargins).map(([key, value]) => [key, Number(value) || 0]));
    if (margins.left + margins.right >= 90 || margins.top + margins.bottom >= 90) {
      throw new Error('Opposing crop margins must add up to less than 90%.');
    }
    const pdf = await PDFDocument.load(await sourceBlob.arrayBuffer(), { ignoreEncryption: true });
    pdf.getPages().forEach((page) => {
      const box = page.getCropBox();
      page.setCropBox(
        box.x + box.width * margins.left / 100,
        box.y + box.height * margins.bottom / 100,
        box.width * (1 - (margins.left + margins.right) / 100),
        box.height * (1 - (margins.top + margins.bottom) / 100),
      );
    });
    return new Blob([await pdf.save()], { type: 'application/pdf' });
  });

  const applyPageNumbers = () => transformResult(async (sourceBlob) => {
    const pdf = await PDFDocument.load(await sourceBlob.arrayBuffer(), { ignoreEncryption: true });
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    pdf.getPages().forEach((page, index) => {
      const { width, height } = page.getSize();
      const text = String(index + 1);
      const size = 11;
      const textWidth = font.widthOfTextAtSize(text, size);
      const margin = 22;
      let x = (width - textWidth) / 2;
      let y = margin;
      if (pageNumberPosition.endsWith('right')) x = width - textWidth - margin;
      if (pageNumberPosition.startsWith('top')) y = height - margin - size;
      page.drawText(text, { x, y, size, font, color: rgb(0.25, 0.25, 0.28) });
    });
    return new Blob([await pdf.save()], { type: 'application/pdf' });
  });

  const applyWatermark = () => transformResult(async (sourceBlob) => {
    if (!watermarkText.trim()) throw new Error('Enter watermark text first.');
    const pdf = await PDFDocument.load(await sourceBlob.arrayBuffer(), { ignoreEncryption: true });
    const font = await pdf.embedFont(StandardFonts.HelveticaBold);
    pdf.getPages().forEach((page) => {
      const { width, height } = page.getSize();
      const textWidthAtBaseSize = font.widthOfTextAtSize(watermarkText, 1);
      const size = Math.min(48, width * 0.075, (width * 0.8) / textWidthAtBaseSize);
      const textWidth = font.widthOfTextAtSize(watermarkText, size);
      page.drawText(watermarkText, {
        x: (width - textWidth) / 2,
        y: height / 2,
        size,
        font,
        color: rgb(0.4, 0.4, 0.42),
        opacity: Number(watermarkOpacity) / 100,
        rotate: degrees(-35),
      });
    });
    return new Blob([await pdf.save()], { type: 'application/pdf' });
  });

  const applyCompression = () => transformResult(async (sourceBlob) => {
    const sourcePdf = await pdfjs.getDocument({ data: new Uint8Array(await sourceBlob.arrayBuffer()) }).promise;
    const compressed = await PDFDocument.create();
    for (let index = 1; index <= sourcePdf.numPages; index += 1) {
      const sourcePage = await sourcePdf.getPage(index);
      const baseViewport = sourcePage.getViewport({ scale: 1 });
      const scale = Math.min(1.4, 2800 / baseViewport.width, 3800 / baseViewport.height);
      const viewport = sourcePage.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext('2d');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      await sourcePage.render({ canvasContext: context, viewport }).promise;
      const jpeg = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', Number(compressionQuality) / 100));
      if (!jpeg) throw new Error(`Could not compress page ${index}.`);
      const image = await compressed.embedJpg(await jpeg.arrayBuffer());
      const width = viewport.width / scale;
      const height = viewport.height / scale;
      const page = compressed.addPage([width, height]);
      page.drawImage(image, { x: 0, y: 0, width, height });
    }
    return new Blob([await compressed.save()], { type: 'application/pdf' });
  });

  const undoLastEdit = () => {
    if (!resultHistory.length) return;
    setResult(resultHistory[resultHistory.length - 1]);
    setResultHistory(history => history.slice(0, -1));
    setActiveEditor(null);
    setError('');
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
    <div className="app-container reducer-page">
      <Navbar onHome={() => {}} theme={theme} toggleTheme={toggleTheme} hideEditorControls={true} />
      <main className="reducer-shell">
        <section className="reducer-workspace">
          <div className="reducer-heading">
            <div><p>PDF Page Tool</p><h1>Stack two pages on one</h1></div>
            <Layers2 size={34} />
          </div>
          <p className="pdf-stacker-intro">Preview your PDF and stack selected page pairs top to bottom. The download keeps every other page in its original order.</p>
          <div className="reducer-grid merger-grid pdf-stacker-grid">
            <div className="reducer-panel">
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
                        {pairs.length > 1 && <button className="icon-btn" type="button" title="Remove pair" onClick={() => { setPairs(items => items.filter(item => item.id !== pair.id)); setResult(null); setResultHistory([]); }}><Trash2 size={16} /></button>}
                      </div>
                      <label>Top page<select value={pair.top} onChange={(event) => updatePair(pair.id, 'top', event.target.value)}>{pageOptions.map(number => <option key={number} value={number}>{number}</option>)}</select></label>
                      <div className="pdf-pair-arrow"><ArrowDown size={16} /></div>
                      <label>Bottom page<select value={pair.bottom} onChange={(event) => updatePair(pair.id, 'bottom', event.target.value)}>{pageOptions.map(number => <option key={number} value={number}>{number}</option>)}</select></label>
                    </div>
                  ))}
                </div>
                <button className="btn-primary reducer-action" onClick={stackPages} disabled={!file || isProcessing}>
                  <Layers2 size={18} /><span>{isProcessing ? 'Stacking pages...' : `Create full PDF with ${pairs.length} stacked pair${pairs.length === 1 ? '' : 's'}`}</span>
                </button>
              </>}
              {error && <p className="reducer-error">{error}</p>}
            </div>
            <div className="reducer-panel pdf-stacker-viewer-panel">
              {file && pdfUrl ? <>
                <div className="pdf-viewer-heading"><div><strong>Original PDF</strong><span>Use the page numbers on the left to choose content.</span></div><a href={pdfUrl} target="_blank" rel="noreferrer" title="Open PDF in a new tab"><ExternalLink size={18} /></a></div>
                <iframe className="pdf-native-viewer" src={`${pdfUrl}#page=${pairs[0]?.top || 1}&toolbar=1&navpanes=0`} title="Original PDF preview" />
                <div className="pdf-pair-live-preview">
                  <div><FileText size={16} /><span>Top: page {pairs[0]?.top}</span></div>
                  <ArrowDown size={16} />
                  <div><FileText size={16} /><span>Bottom: page {pairs[0]?.bottom}</span></div>
                </div>
                {result && <div className="pdf-continue-workflow">
                  <button className="btn-primary reducer-action" onClick={download} disabled={isProcessing}><Download size={18} /><span>Download full stacked PDF</span></button>
                  <div className="pdf-continue-heading"><strong>Continue editing this PDF</strong><span>Apply more changes without uploading it again.</span></div>
                  <div className="pdf-continue-tools">
                    <button type="button" className={activeEditor === 'crop' ? 'active' : ''} onClick={() => setActiveEditor(activeEditor === 'crop' ? null : 'crop')}><Crop size={17} />Crop</button>
                    <button type="button" className={activeEditor === 'compress' ? 'active' : ''} onClick={() => setActiveEditor(activeEditor === 'compress' ? null : 'compress')}><FileDown size={17} />Compress</button>
                    <button type="button" className={activeEditor === 'numbers' ? 'active' : ''} onClick={() => setActiveEditor(activeEditor === 'numbers' ? null : 'numbers')}><Hash size={17} />Page numbers</button>
                    <button type="button" className={activeEditor === 'watermark' ? 'active' : ''} onClick={() => setActiveEditor(activeEditor === 'watermark' ? null : 'watermark')}><Stamp size={17} />Watermark</button>
                  </div>
                  {activeEditor === 'crop' && <div className="pdf-edit-options">
                    <strong>Crop margins on every page (%)</strong>
                    <div className="pdf-margin-fields">
                      {['top', 'bottom', 'left', 'right'].map(side => <label key={side}>{side}<input type="number" min="0" max="45" value={cropMargins[side]} onChange={(event) => setCropMargins(current => ({ ...current, [side]: event.target.value }))} /></label>)}
                    </div>
                    <button type="button" className="btn-primary" onClick={applyCrop} disabled={isProcessing}>{isProcessing ? 'Applying...' : 'Apply crop'}</button>
                  </div>}
                  {activeEditor === 'compress' && <div className="pdf-edit-options">
                    <strong>Image quality: {compressionQuality}%</strong>
                    <input className="pdf-quality-slider" type="range" min="35" max="90" step="5" value={compressionQuality} onChange={(event) => setCompressionQuality(event.target.value)} />
                    <p>Lower quality makes a smaller PDF. Compression flattens pages, so their text will no longer be selectable.</p>
                    <button type="button" className="btn-primary" onClick={applyCompression} disabled={isProcessing}>{isProcessing ? 'Compressing...' : 'Compress PDF'}</button>
                  </div>}
                  {activeEditor === 'numbers' && <div className="pdf-edit-options">
                    <strong>Add a number to every page</strong>
                    <label className="pdf-edit-select-label">Position<select value={pageNumberPosition} onChange={(event) => setPageNumberPosition(event.target.value)}><option value="bottom-center">Bottom center</option><option value="bottom-right">Bottom right</option><option value="top-right">Top right</option></select></label>
                    <button type="button" className="btn-primary" onClick={applyPageNumbers} disabled={isProcessing}>{isProcessing ? 'Adding...' : 'Add page numbers'}</button>
                  </div>}
                  {activeEditor === 'watermark' && <div className="pdf-edit-options">
                    <label className="pdf-edit-select-label">Watermark text<input type="text" maxLength="60" value={watermarkText} onChange={(event) => setWatermarkText(event.target.value)} /></label>
                    <strong>Opacity: {watermarkOpacity}%</strong>
                    <input className="pdf-quality-slider" type="range" min="5" max="70" step="5" value={watermarkOpacity} onChange={(event) => setWatermarkOpacity(event.target.value)} />
                    <button type="button" className="btn-primary" onClick={applyWatermark} disabled={isProcessing}>{isProcessing ? 'Adding...' : 'Add watermark'}</button>
                  </div>}
                  {resultHistory.length > 0 && <button className="pdf-undo-edit" type="button" onClick={undoLastEdit} disabled={isProcessing}><Undo2 size={16} /> Undo last change</button>}
                </div>}
              </> : <div className="reducer-empty"><Layers2 size={44} /><p>Upload a PDF to preview its pages here.</p></div>}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default PdfPageStackerPage;
