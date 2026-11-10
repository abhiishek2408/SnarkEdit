import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument } from 'pdf-lib';
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUpDown, Check, ChevronLeft, ChevronRight,
  Columns2, Download, FileText, Files, HelpCircle, Layers, MoveHorizontal,
  MoveVertical, RefreshCw, RotateCcw, Rows2, Scissors, Sparkles, Split,
  Trash2, Upload, X, Zap
} from 'lucide-react';
import Navbar from '../components/Navbar';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import CheckCircle2 from 'lucide-react/dist/esm/icons/check-circle-2';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const PRESET_RATIOS = [
  { label: '50 / 50', ratio: 0.5, desc: 'Exact Center' },
  { label: '40 / 60', ratio: 0.4, desc: '40% / 60%' },
  { label: '60 / 40', ratio: 0.6, desc: '60% / 40%' },
  { label: '33 / 67', ratio: 0.33, desc: '1/3 & 2/3' },
  { label: '67 / 33', ratio: 0.67, desc: '2/3 & 1/3' },
];

const MARGIN_PRESETS = [
  { label: 'None (0)', val: 0 },
  { label: 'Small (15 pt)', val: 15 },
  { label: 'Medium (25 pt)', val: 25 },
  { label: 'Large (40 pt)', val: 40 },
];

const PdfPageSplitterPage = ({ theme, toggleTheme }) => {
  const [file, setFile] = useState(null);
  const [pdfDocument, setPdfDocument] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [pagesMeta, setPagesMeta] = useState([]);
  const [pageSplits, setPageSplits] = useState({});
  const [activePage, setActivePage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');

  // Split editor controls for active page
  const [direction, setDirection] = useState('vertical');
  const [ratio, setRatio] = useState(0.5);
  const [margin, setMargin] = useState(25); // Default 25 pt margin at cut edge
  const [order, setOrder] = useState('normal'); // 'normal' (Part 1 then Part 2) or 'reverse'
  const [isDragging, setIsDragging] = useState(false);

  // Previews
  const [activeCanvas, setActiveCanvas] = useState(null);
  const [part1Preview, setPart1Preview] = useState('');
  const [part2Preview, setPart2Preview] = useState('');
  const [pageThumbnails, setPageThumbnails] = useState({});

  const canvasWrapRef = useRef(null);
  const renderTaskRef = useRef(null);

  // Load PDF file
  const handleFile = async (selected) => {
    const nextFile = selected?.[0];
    if (!nextFile) return;
    setFile(null);
    setPdfDocument(null);
    setPageCount(0);
    setPagesMeta([]);
    setPageSplits({});
    setActivePage(1);
    setPageThumbnails({});
    setActiveCanvas(null);
    setPart1Preview('');
    setPart2Preview('');
    setError('');

    try {
      const data = new Uint8Array(await nextFile.arrayBuffer());
      const doc = await pdfjs.getDocument({ data: data.slice() }).promise;
      setFile(nextFile);
      setPdfDocument(doc);
      setPageCount(doc.numPages);

      // Inspect dimensions of each page
      const metas = [];
      let firstWidePage = null;

      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const vp = page.getViewport({ scale: 1 });
        const isWide = vp.width > vp.height * 1.15;
        const isTall = vp.height > vp.width * 1.6;
        metas.push({
          pageNumber: i,
          width: Math.round(vp.width),
          height: Math.round(vp.height),
          isWide,
          isTall,
          aspect: vp.width / vp.height,
        });

        if (isWide && !firstWidePage) {
          firstWidePage = i;
        }
      }
      setPagesMeta(metas);

      if (firstWidePage) {
        setActivePage(firstWidePage);
      }
    } catch (err) {
      setError(err.message || 'Could not load this PDF. Please select a valid, unprotected PDF.');
    }
  };

  // Render active page canvas
  useEffect(() => {
    if (!pdfDocument || !activePage) return;
    let cancelled = false;

    const renderActive = async () => {
      try {
        renderTaskRef.current?.cancel();
        const page = await pdfDocument.getPage(activePage);
        const baseVp = page.getViewport({ scale: 1 });
        const targetWidth = Math.min(840, window.innerWidth - 380);
        const scale = Math.min(1.5, Math.max(0.6, targetWidth / baseVp.width));
        const vp = page.getViewport({ scale });
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

        const canvas = window.document.createElement('canvas');
        canvas.width = Math.ceil(vp.width * pixelRatio);
        canvas.height = Math.ceil(vp.height * pixelRatio);
        const ctx = canvas.getContext('2d');

        const task = page.render({
          canvasContext: ctx,
          viewport: vp,
          transform: pixelRatio === 1 ? null : [pixelRatio, 0, 0, pixelRatio, 0, 0],
        });
        renderTaskRef.current = task;
        await task.promise;

        if (cancelled) return;
        setActiveCanvas(canvas);

        // Also save thumbnail for sidebar
        const thumbCanvas = window.document.createElement('canvas');
        const thumbScale = 120 / baseVp.width;
        const thumbVp = page.getViewport({ scale: thumbScale });
        thumbCanvas.width = Math.ceil(thumbVp.width);
        thumbCanvas.height = Math.ceil(thumbVp.height);
        thumbCanvas.getContext('2d').drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
        const thumbUrl = thumbCanvas.toDataURL('image/jpeg', 0.85);

        setPageThumbnails(prev => ({ ...prev, [activePage]: thumbUrl }));
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException' && !cancelled) {
          console.error(`Error rendering page ${activePage}`, err);
        }
      }
    };

    renderActive();
    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [pdfDocument, activePage]);

  // Sync split controls when active page changes
  useEffect(() => {
    const existingSplit = pageSplits[activePage];
    const meta = pagesMeta[activePage - 1];

    if (existingSplit) {
      setDirection(existingSplit.direction);
      setRatio(existingSplit.ratio);
      setMargin(existingSplit.margin ?? 25);
      setOrder(existingSplit.order || 'normal');
    } else if (meta) {
      setDirection(meta.isTall ? 'horizontal' : 'vertical');
      setRatio(0.5);
      setMargin(25);
      setOrder('normal');
    }
  }, [activePage, pageSplits, pagesMeta]);

  // Generate live Part 1 and Part 2 thumbnails with inner margins
  useEffect(() => {
    if (!activeCanvas) return;
    const isVert = direction === 'vertical';
    const c1 = window.document.createElement('canvas');
    const c2 = window.document.createElement('canvas');
    const meta = pagesMeta[activePage - 1];

    if (isVert) {
      const cutX = Math.max(1, Math.min(activeCanvas.width - 1, Math.round(activeCanvas.width * ratio)));
      const marginPx = Math.round(margin * (activeCanvas.width / (meta?.width || 800)));

      // Part 1: gets right margin of marginPx
      c1.width = cutX + marginPx;
      c1.height = activeCanvas.height;
      const ctx1 = c1.getContext('2d');
      ctx1.fillStyle = '#ffffff';
      ctx1.fillRect(0, 0, c1.width, c1.height);
      ctx1.drawImage(activeCanvas, 0, 0, cutX, activeCanvas.height, 0, 0, cutX, activeCanvas.height);

      // Part 2: gets left margin of marginPx
      c2.width = (activeCanvas.width - cutX) + marginPx;
      c2.height = activeCanvas.height;
      const ctx2 = c2.getContext('2d');
      ctx2.fillStyle = '#ffffff';
      ctx2.fillRect(0, 0, c2.width, c2.height);
      ctx2.drawImage(activeCanvas, cutX, 0, activeCanvas.width - cutX, activeCanvas.height, marginPx, 0, activeCanvas.width - cutX, activeCanvas.height);
    } else {
      const cutY = Math.max(1, Math.min(activeCanvas.height - 1, Math.round(activeCanvas.height * ratio)));
      const marginPx = Math.round(margin * (activeCanvas.height / (meta?.height || 1000)));

      // Top part: gets bottom margin of marginPx
      c1.width = activeCanvas.width;
      c1.height = cutY + marginPx;
      const ctx1 = c1.getContext('2d');
      ctx1.fillStyle = '#ffffff';
      ctx1.fillRect(0, 0, c1.width, c1.height);
      ctx1.drawImage(activeCanvas, 0, 0, activeCanvas.width, cutY, 0, 0, activeCanvas.width, cutY);

      // Bottom part: gets top margin of marginPx
      c2.width = activeCanvas.width;
      c2.height = (activeCanvas.height - cutY) + marginPx;
      const ctx2 = c2.getContext('2d');
      ctx2.fillStyle = '#ffffff';
      ctx2.fillRect(0, 0, c2.width, c2.height);
      ctx2.drawImage(activeCanvas, 0, cutY, activeCanvas.width, activeCanvas.height - cutY, 0, marginPx, activeCanvas.width, activeCanvas.height - cutY);
    }

    const u1 = c1.toDataURL('image/png');
    const u2 = c2.toDataURL('image/png');

    if (order === 'reverse') {
      setPart1Preview(u2);
      setPart2Preview(u1);
    } else {
      setPart1Preview(u1);
      setPart2Preview(u2);
    }
  }, [activeCanvas, direction, ratio, margin, order, pagesMeta, activePage]);

  // Pointer dragging on cut divider line
  const updateRatioFromPointer = useCallback((e) => {
    const wrap = canvasWrapRef.current;
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    let nextRatio;
    if (direction === 'vertical') {
      nextRatio = (e.clientX - rect.left) / rect.width;
    } else {
      nextRatio = (e.clientY - rect.top) / rect.height;
    }
    nextRatio = Math.max(0.1, Math.min(0.9, nextRatio));
    setRatio(Math.round(nextRatio * 100) / 100);
  }, [direction]);

  const handlePointerDown = (e) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
    setIsDragging(true);
    updateRatioFromPointer(e);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    updateRatioFromPointer(e);
  };

  const handlePointerUp = (e) => {
    if (e.currentTarget?.hasPointerCapture?.(e.pointerId)) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
    setIsDragging(false);
  };

  // Apply split to active page
  const applySplitToActive = () => {
    setPageSplits(prev => ({
      ...prev,
      [activePage]: { direction, ratio, margin, order },
    }));
  };

  // Remove split from active page
  const removeSplitFromActive = () => {
    setPageSplits(prev => {
      const next = { ...prev };
      delete next[activePage];
      return next;
    });
  };

  // Auto-split all wide pages (50/50 vertical with margin)
  const autoSplitAllWidePages = () => {
    const newSplits = { ...pageSplits };
    pagesMeta.forEach(meta => {
      if (meta.isWide) {
        newSplits[meta.pageNumber] = {
          direction: 'vertical',
          ratio: 0.5,
          margin: 25,
          order: 'normal',
        };
      }
    });
    setPageSplits(newSplits);
  };

  // Reset all splits
  const resetAllSplits = () => {
    setPageSplits({});
  };

  // Download split PDF with margins guaranteed in the exported document
  const download = async () => {
    if (!file || !pdfDocument || !Object.keys(pageSplits).length) return;
    setIsExporting(true);
    setError('');

    try {
      const originalBytes = await file.arrayBuffer();
      const original = await PDFDocument.load(originalBytes, { ignoreEncryption: true });
      const output = await PDFDocument.create();
      const numPages = original.getPageCount();

      for (let index = 0; index < numPages; index++) {
        const pageNumber = index + 1;
        const split = pageSplits[pageNumber];

        if (!split) {
          // Unaltered page: native lossless vector copy
          const [copiedPage] = await output.copyPages(original, [index]);
          output.addPage(copiedPage);
          continue;
        }

        const curRatio = split.ratio || 0.5;
        const curMargin = split.margin ?? 25;
        const curDirection = split.direction || 'vertical';
        const isReverse = split.order === 'reverse';

        // High-resolution crisp rendering (scale 2.8, 250-300 DPI)
        // This guarantees that top page has pure white bottom margin,
        // and bottom page has pure white top margin, matching the preview 100%!
        const sourcePage = await pdfDocument.getPage(pageNumber);
        const baseVp = sourcePage.getViewport({ scale: 1 });
        const scale = 2.8;
        const viewport = sourcePage.getViewport({ scale });
        const canvas = window.document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await sourcePage.render({ canvasContext: ctx, viewport }).promise;

        if (curDirection === 'vertical') {
          const cutPx = Math.max(1, Math.min(canvas.width - 1, Math.round(canvas.width * curRatio)));
          const marginPx = Math.round(curMargin * scale);

          // Part 1: gets pure white right margin of marginPx
          const c1 = window.document.createElement('canvas');
          c1.width = cutPx + marginPx;
          c1.height = canvas.height;
          const ctx1 = c1.getContext('2d');
          ctx1.fillStyle = '#ffffff';
          ctx1.fillRect(0, 0, c1.width, c1.height);
          ctx1.drawImage(canvas, 0, 0, cutPx, canvas.height, 0, 0, cutPx, canvas.height);
          const p1Blob = await new Promise(r => c1.toBlob(r, 'image/png'));
          const img1 = await output.embedPng(await p1Blob.arrayBuffer());

          // Part 2: gets pure white left margin of marginPx
          const c2 = window.document.createElement('canvas');
          c2.width = (canvas.width - cutPx) + marginPx;
          c2.height = canvas.height;
          const ctx2 = c2.getContext('2d');
          ctx2.fillStyle = '#ffffff';
          ctx2.fillRect(0, 0, c2.width, c2.height);
          ctx2.drawImage(canvas, cutPx, 0, canvas.width - cutPx, canvas.height, marginPx, 0, canvas.width - cutPx, canvas.height);
          const p2Blob = await new Promise(r => c2.toBlob(r, 'image/png'));
          const img2 = await output.embedPng(await p2Blob.arrayBuffer());

          const w1 = (baseVp.width * curRatio) + curMargin;
          const w2 = (baseVp.width * (1 - curRatio)) + curMargin;
          const h = baseVp.height;

          const partA = { img: img1, w: w1, h };
          const partB = { img: img2, w: w2, h };
          const first = isReverse ? partB : partA;
          const second = isReverse ? partA : partB;

          const pA = output.addPage([first.w, first.h]);
          pA.drawImage(first.img, { x: 0, y: 0, width: first.w, height: first.h });

          const pB = output.addPage([second.w, second.h]);
          pB.drawImage(second.img, { x: 0, y: 0, width: second.w, height: second.h });
        } else {
          // Horizontal Split
          const cutPx = Math.max(1, Math.min(canvas.height - 1, Math.round(canvas.height * curRatio)));
          const marginPx = Math.round(curMargin * scale);

          // Top part: gets pure white bottom margin of marginPx
          const c1 = window.document.createElement('canvas');
          c1.width = canvas.width;
          c1.height = cutPx + marginPx;
          const ctx1 = c1.getContext('2d');
          ctx1.fillStyle = '#ffffff';
          ctx1.fillRect(0, 0, c1.width, c1.height);
          ctx1.drawImage(canvas, 0, 0, canvas.width, cutPx, 0, 0, canvas.width, cutPx);
          const p1Blob = await new Promise(r => c1.toBlob(r, 'image/png'));
          const img1 = await output.embedPng(await p1Blob.arrayBuffer());

          // Bottom part: gets pure white top margin of marginPx
          const c2 = window.document.createElement('canvas');
          c2.width = canvas.width;
          c2.height = (canvas.height - cutPx) + marginPx;
          const ctx2 = c2.getContext('2d');
          ctx2.fillStyle = '#ffffff';
          ctx2.fillRect(0, 0, c2.width, c2.height);
          ctx2.drawImage(canvas, 0, cutPx, canvas.width, canvas.height - cutPx, 0, marginPx, canvas.width, canvas.height - cutPx);
          const p2Blob = await new Promise(r => c2.toBlob(r, 'image/png'));
          const img2 = await output.embedPng(await p2Blob.arrayBuffer());

          const w = baseVp.width;
          const h1 = (baseVp.height * curRatio) + curMargin;
          const h2 = (baseVp.height * (1 - curRatio)) + curMargin;

          const partA = { img: img1, w, h: h1 };
          const partB = { img: img2, w, h: h2 };
          const first = isReverse ? partB : partA;
          const second = isReverse ? partA : partB;

          const pA = output.addPage([first.w, first.h]);
          pA.drawImage(first.img, { x: 0, y: 0, width: first.w, height: first.h });

          const pB = output.addPage([second.w, second.h]);
          pB.drawImage(second.img, { x: 0, y: 0, width: second.w, height: second.h });
        }
      }

      const blob = new Blob([await output.save()], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = `${file.name.replace(/\.pdf$/i, '')}-split.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Could not export the split PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const activeMeta = pagesMeta[activePage - 1];
  const isCurrentPageSplit = Boolean(pageSplits[activePage]);
  const splitCount = Object.keys(pageSplits).length;
  const widePagesCount = pagesMeta.filter(m => m.isWide).length;
  const resultingPageCount = pageCount + splitCount;

  return (
    <div className="app-container reducer-page pdf-tool-page pdf-split-page">
      <Navbar onHome={() => {}} theme={theme} toggleTheme={toggleTheme} hideEditorControls={true} />
      <main className="reducer-shell">
        <section className="reducer-workspace">
          {/* Header (shown only when no PDF is loaded) */}
          {!pdfDocument && (
            <div className="reducer-heading">
              <div>
                <p>PDF Tools</p>
                <h1>Split PDF Pages</h1>
              </div>
              <Split size={34} className="desktop-only" />
            </div>
          )}

          {!pdfDocument ? (
            <div className="pdf-merge-upload-hero">
              <p className="pdf-stacker-intro" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 1.5rem' }}>
                Divide oversized, wide, or tall PDF pages into two separate individual pages. Ideal for books scanned 2-pages-per-sheet, double-page spreads, and long documents.
              </p>
              <label className="pdf-merge-dropzone">
                <div className="pdf-merge-upload-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
                  <Upload size={32} />
                </div>
                <strong>Select PDF to split</strong>
                <span>Drag & drop PDF here, or click to browse</span>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => handleFile(e.target.files)}
                  style={{ display: 'none' }}
                />
              </label>

              <div className="pdf-merge-features-badges">
                <div className="pdf-merge-badge-item">
                  <Columns2 size={16} />
                  <span>Vertical & Horizontal Splits</span>
                </div>
                <div className="pdf-merge-badge-item">
                  <Zap size={16} />
                  <span>Auto-Detect Wide Spreads</span>
                </div>
                <div className="pdf-merge-badge-item">
                  <Sparkles size={16} />
                  <span>Adjustable Margins</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="pdf-split-layout has-pdf">
              {/* Left Controls Panel */}
              <section className="reducer-panel pdf-split-controls">
                <div className="reducer-panel pdf-remove-card" style={{ padding: '0.85rem' }}>
                  <div className="pdf-remove-file-header">
                    <div className="pdf-remove-file-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
                      <FileText size={20} />
                    </div>
                    <div className="pdf-remove-file-meta">
                      <strong title={file?.name}>{file?.name}</strong>
                      <span>{pageCount} pages loaded</span>
                    </div>
                  </div>
                  <button className="pdf-remove-change-btn" onClick={() => document.querySelector('.change-pdf-input').click()} style={{ marginTop: '0.5rem' }}>
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

                {/* Auto-split wide pages suggestion */}
                {widePagesCount > 0 && splitCount < widePagesCount && (
                  <div className="pdf-split-auto-tip">
                    <div className="pdf-split-auto-text">
                      <Zap size={16} />
                      <span>Detected <strong>{widePagesCount}</strong> wide / 2-page spread{widePagesCount > 1 ? 's' : ''}!</span>
                    </div>
                    <button
                      type="button"
                      className="btn-primary pdf-split-quick-btn"
                      onClick={autoSplitAllWidePages}
                      title="Split all wide pages 50/50 vertically into single pages"
                    >
                      <Columns2 size={14} />
                      <span>Split All Wide Pages (50/50)</span>
                    </button>
                  </div>
                )}

                {/* Current Active Page Box */}
                <div className="pdf-split-active-card">
                  <div className="pdf-split-active-header">
                    <strong>Page {activePage} Settings</strong>
                    {isCurrentPageSplit && <span className="pdf-split-badge active">✓ Split Active</span>}
                  </div>

                  {/* Split Direction */}
                  <div className="pdf-split-field">
                    <label>Direction</label>
                    <div className="pdf-split-toggle-group">
                      <button
                        type="button"
                        className={direction === 'vertical' ? 'active' : ''}
                        onClick={() => setDirection('vertical')}
                      >
                        <Columns2 size={15} />
                        <span>Vertical</span>
                      </button>
                      <button
                        type="button"
                        className={direction === 'horizontal' ? 'active' : ''}
                        onClick={() => setDirection('horizontal')}
                      >
                        <Rows2 size={15} />
                        <span>Horizontal</span>
                      </button>
                    </div>
                  </div>

                  {/* Split Ratio Slider */}
                  <div className="pdf-split-field">
                    <div className="pdf-split-slider-header">
                      <label>Cut Position</label>
                      <strong>
                        {Math.round(ratio * 100)}% / {Math.round((1 - ratio) * 100)}%
                      </strong>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      step="1"
                      value={Math.round(ratio * 100)}
                      onChange={(e) => setRatio(Number(e.target.value) / 100)}
                      className="pdf-split-range"
                    />
                  </div>

                  {/* Cut Edge Margin */}
                  <div className="pdf-split-field">
                    <div className="pdf-split-slider-header">
                      <label>Margin (Padding)</label>
                      <strong>{margin} pt</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="60"
                      step="5"
                      value={margin}
                      onChange={(e) => setMargin(Number(e.target.value))}
                      className="pdf-split-range"
                    />
                  </div>

                  {/* Page Order Toggle */}
                  <div className="pdf-split-field">
                    <label>Sequence</label>
                    <button
                      type="button"
                      className="pdf-split-order-toggle"
                      onClick={() => setOrder(order === 'normal' ? 'reverse' : 'normal')}
                    >
                      <ArrowRight size={14} />
                      <span>{order === 'normal' ? 'Normal (1 → 2)' : 'Reverse (2 → 1)'}</span>
                    </button>
                  </div>

                  {/* Apply / Remove Split Button */}
                  <div className="pdf-split-action-buttons">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={applySplitToActive}
                    >
                      <Scissors size={15} />
                      <span>{isCurrentPageSplit ? 'Update Split' : 'Apply Split'}</span>
                    </button>

                    {isCurrentPageSplit && (
                      <button
                        type="button"
                        className="pdf-clear-crop"
                        onClick={removeSplitFromActive}
                      >
                        <X size={15} />
                        <span>Remove Split</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Bulk Actions */}
                {splitCount > 0 && (
                  <div className="pdf-split-bulk">
                    <button
                      type="button"
                      className="pdf-clear-crop"
                      onClick={resetAllSplits}
                    >
                      <RotateCcw size={15} />
                      <span>Reset All Splits ({splitCount})</span>
                    </button>
                  </div>
                )}

                {/* Download Button */}
                <button
                  className="btn-primary reducer-action"
                  type="button"
                  onClick={download}
                  disabled={!splitCount || isExporting}
                >
                  <Download size={18} />
                  <span>{isExporting ? 'Generating PDF...' : `Download PDF (${resultingPageCount} Pages)`}</span>
                </button>

                {error && <p className="reducer-error">{error}</p>}
              </section>

              {/* Right Panel: Split Workspace */}
              <section className="reducer-panel pdf-split-workspace-panel">
                {/* Main Split Stage: Canvas on Left, Resulting 2 Pages Preview on Right */}
                <div className="pdf-split-stage">
                  {/* Left Column: Interactive Split Canvas */}
                  <div className="pdf-split-editor-col">
                    <div className="pdf-split-editor-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.55rem 0.85rem', background: 'var(--tool-bg)', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <button
                          type="button"
                          className="pdf-split-nav-arrow"
                          disabled={activePage <= 1}
                          onClick={() => setActivePage(p => Math.max(1, p - 1))}
                          title="Previous Page"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '5px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', cursor: activePage <= 1 ? 'not-allowed' : 'pointer', opacity: activePage <= 1 ? 0.4 : 1 }}
                        >
                          <ChevronLeft size={15} />
                        </button>
                        <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>
                          Page {activePage} of {pageCount}
                        </strong>
                        <button
                          type="button"
                          className="pdf-split-nav-arrow"
                          disabled={activePage >= pageCount}
                          onClick={() => setActivePage(p => Math.min(pageCount, p + 1))}
                          title="Next Page"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '5px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)', cursor: activePage >= pageCount ? 'not-allowed' : 'pointer', opacity: activePage >= pageCount ? 0.4 : 1 }}
                        >
                          <ChevronRight size={15} />
                        </button>
                      </div>

                      <span className="pdf-split-hint-text" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {direction === 'vertical' ? '↔ Drag cut line left or right' : '↕ Drag cut line up or down'}
                      </span>
                    </div>

                    <div className="pdf-split-canvas-stage">
                      <div
                        className="pdf-split-canvas-wrapper"
                        ref={canvasWrapRef}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                      >
                        {activeCanvas ? (
                          <canvas
                            ref={(node) => {
                              if (node && activeCanvas) {
                                node.width = activeCanvas.width;
                                node.height = activeCanvas.height;
                                const ctx = node.getContext('2d');
                                ctx.drawImage(activeCanvas, 0, 0);
                              }
                            }}
                          />
                        ) : (
                          <div className="pdf-split-loading">Loading page {activePage}...</div>
                        )}

                        {/* Interactive Draggable Cut Divider */}
                        {activeCanvas && (
                          <div
                            className={`pdf-split-divider ${direction} ${isDragging ? 'dragging' : ''}`}
                            style={{
                              left: direction === 'vertical' ? `${ratio * 100}%` : '0',
                              top: direction === 'horizontal' ? `${ratio * 100}%` : '0',
                              width: direction === 'vertical' ? '4px' : '100%',
                              height: direction === 'horizontal' ? '4px' : '100%',
                            }}
                          >
                            <div className="pdf-split-divider-handle">
                              <Scissors size={14} />
                              <span>
                                Cut {Math.round(ratio * 100)}%
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Side Labels on Page */}
                        {activeCanvas && (
                          <>
                            <div
                              className={`pdf-split-section-label part-1 ${direction}`}
                              style={
                                direction === 'vertical'
                                  ? { left: '10px', top: '10px' }
                                  : { left: '10px', top: '10px' }
                              }
                            >
                              Page {activePage}A
                            </div>
                            <div
                              className={`pdf-split-section-label part-2 ${direction}`}
                              style={
                                direction === 'vertical'
                                  ? { right: '10px', top: '10px' }
                                  : { left: '10px', bottom: '10px' }
                              }
                            >
                              Page {activePage}B
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Resulting 2 Pages Live Preview Cards (Stacked Vertically) */}
                  <div className="pdf-split-results-panel">
                    <div className="pdf-split-results-title">
                      <strong>Result Preview</strong>
                    </div>

                    <div className="pdf-split-results-cards vertical">
                      {/* Card 1: New Page A */}
                      <div className="pdf-split-card">
                        <div className="pdf-split-card-header">
                          <strong>Page {activePage}A</strong>
                          <span>{order === 'normal' ? 'Part 1' : 'Part 2'}</span>
                        </div>
                        <div className="pdf-split-card-preview">
                          {part1Preview ? (
                            <img src={part1Preview} alt={`Page ${activePage}A`} />
                          ) : (
                            <div className="preview-placeholder">Loading...</div>
                          )}
                        </div>
                      </div>

                      <div className="pdf-split-arrow-divider vertical">
                        <ArrowDown size={16} />
                      </div>

                      {/* Card 2: New Page B */}
                      <div className="pdf-split-card">
                        <div className="pdf-split-card-header">
                          <strong>Page {activePage}B</strong>
                          <span>{order === 'normal' ? 'Part 2' : 'Part 1'}</span>
                        </div>
                        <div className="pdf-split-card-preview">
                          {part2Preview ? (
                            <img src={part2Preview} alt={`Page ${activePage}B`} />
                          ) : (
                            <div className="preview-placeholder">Loading...</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Flow Overview of Document */}
                {pdfDocument && (
                  <div className="pdf-split-doc-flow">
                    <div className="pdf-split-flow-title">
                      <Files size={16} />
                      <strong>Document Page Flow Overview:</strong>
                    </div>
                    <div className="pdf-split-flow-list">
                      {Array.from({ length: pageCount }, (_, i) => {
                        const pNum = i + 1;
                        const split = pageSplits[pNum];
                        if (split) {
                          return (
                            <React.Fragment key={pNum}>
                              <span className="pdf-flow-pill split">
                                Page {pNum}A ({split.direction === 'vertical' ? 'Left' : 'Top'})
                              </span>
                              <span className="pdf-flow-arrow">→</span>
                              <span className="pdf-flow-pill split">
                                Page {pNum}B ({split.direction === 'vertical' ? 'Right' : 'Bottom'})
                              </span>
                              {pNum < pageCount && <span className="pdf-flow-arrow">→</span>}
                            </React.Fragment>
                          );
                        }
                        return (
                          <React.Fragment key={pNum}>
                            <span
                              className={`pdf-flow-pill ${activePage === pNum ? 'current' : ''}`}
                              onClick={() => setActivePage(pNum)}
                              style={{ cursor: 'pointer' }}
                            >
                              Page {pNum}
                            </span>
                            {pNum < pageCount && <span className="pdf-flow-arrow">→</span>}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default PdfPageSplitterPage;
