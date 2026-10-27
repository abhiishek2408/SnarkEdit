import React, { useEffect, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { ArrowDown, Download, ExternalLink, FileText, Layers2, Plus, Trash2, Upload } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const PdfPageStackerPage = ({ theme, toggleTheme }) => {
  const [file, setFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [pageCount, setPageCount] = useState(0);
  const [pairs, setPairs] = useState([]);
  const [result, setResult] = useState(null);
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
      const source = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      const output = await PDFDocument.create();
      const pairAtIndex = new Map();
      const pairedIndices = new Set();
      indices.forEach(([topIndex, bottomIndex]) => {
        pairAtIndex.set(Math.min(topIndex, bottomIndex), { topIndex, bottomIndex });
        pairedIndices.add(topIndex);
        pairedIndices.add(bottomIndex);
      });

      for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
        const pair = pairAtIndex.get(pageIndex);
        if (pair) {
          const [top, bottom] = await output.embedPages([
            source.getPages()[pair.topIndex],
            source.getPages()[pair.bottomIndex],
          ]);
          const gap = 12;
          const width = Math.max(top.width, bottom.width);
          const topHeight = top.height * (width / top.width);
          const bottomHeight = bottom.height * (width / bottom.width);
          const page = output.addPage([width, topHeight + gap + bottomHeight]);
          page.drawPage(top, { x: 0, y: bottomHeight + gap, width, height: topHeight });
          page.drawPage(bottom, { x: 0, y: 0, width, height: bottomHeight });
          continue;
        }
        if (pairedIndices.has(pageIndex)) continue;
        const [originalPage] = await output.copyPages(source, [pageIndex]);
        output.addPage(originalPage);
      }
      setResult(new Blob([await output.save()], { type: 'application/pdf' }));
    } catch (err) {
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
    link.click();
    URL.revokeObjectURL(url);
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
                <button className="pdf-add-pair" type="button" onClick={addPair}><Plus size={17} /> Add another pair</button>
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
                {result && <button className="btn-primary reducer-action" onClick={download}><Download size={18} /><span>Download full stacked PDF</span></button>}
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
