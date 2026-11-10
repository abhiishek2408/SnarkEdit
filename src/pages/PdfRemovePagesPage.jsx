import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument } from 'pdf-lib';
import {
  Upload,
  Trash2,
  Download,
  FileText,
  FileMinus,
  Check,
  RotateCcw,
  ZoomIn,
  X,
  Sparkles,
  AlertCircle,
  Eye,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckSquare,
  Square,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import Navbar from '../components/Navbar';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const formatFileSize = (bytes) => {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const parseRangeString = (input, maxPages) => {
  if (!input || !input.trim()) return [];
  const pages = new Set();
  const segments = input.split(',');
  for (const seg of segments) {
    const trimmed = seg.trim();
    if (!trimmed) continue;
    if (trimmed.includes('-')) {
      const parts = trimmed.split('-');
      const start = parseInt(parts[0], 10);
      const end = parseInt(parts[1], 10);
      if (!isNaN(start) && !isNaN(end)) {
        const min = Math.max(1, Math.min(start, end));
        const max = Math.min(maxPages, Math.max(start, end));
        for (let i = min; i <= max; i++) {
          pages.add(i);
        }
      }
    } else {
      const p = parseInt(trimmed, 10);
      if (!isNaN(p) && p >= 1 && p <= maxPages) {
        pages.add(p);
      }
    }
  }
  return Array.from(pages).sort((a, b) => a - b);
};

const PdfRemovePagesPage = ({ theme, toggleTheme }) => {
  const [file, setFile] = useState(null);
  const [pdfDocument, setPdfDocument] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [thumbnails, setThumbnails] = useState({});
  const [removedPages, setRemovedPages] = useState(new Set());
  const [rangeInput, setRangeInput] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'kept', 'removed'
  const [gridSize, setGridSize] = useState('medium'); // 'small', 'medium', 'large'
  const [previewPage, setPreviewPage] = useState(null); // page number for zoom modal
  const [previewModalImg, setPreviewModalImg] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const cancelLoadingRef = useRef(false);

  // Handle uploaded file
  const handleFile = async (selected) => {
    const nextFile = selected?.[0];
    if (!nextFile) return;

    cancelLoadingRef.current = true;
    setFile(null);
    setPdfDocument(null);
    setPageCount(0);
    setThumbnails({});
    setRemovedPages(new Set());
    setRangeInput('');
    setPreviewPage(null);
    setPreviewModalImg('');
    setError('');
    setSuccessMsg('');

    try {
      const data = new Uint8Array(await nextFile.arrayBuffer());
      const doc = await pdfjs.getDocument({ data: data.slice() }).promise;

      setFile(nextFile);
      setPdfDocument(doc);
      setPageCount(doc.numPages);
      cancelLoadingRef.current = false;

      // Render thumbnails progressively
      loadThumbnails(doc, doc.numPages);
    } catch (err) {
      console.error(err);
      setError('Could not open this PDF. Please check if the file is valid or password-protected.');
    }
  };

  const loadThumbnails = async (doc, total) => {
    for (let p = 1; p <= total; p++) {
      if (cancelLoadingRef.current) break;
      try {
        const page = await doc.getPage(p);
        const base = page.getViewport({ scale: 1 });
        const scale = Math.min(1.5, Math.max(0.4, 380 / base.width));
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;

        if (cancelLoadingRef.current) break;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        setThumbnails((prev) => ({ ...prev, [p]: dataUrl }));
      } catch (err) {
        console.warn(`Could not render thumbnail for page ${p}:`, err);
      }
    }
  };

  // Toggle single page removal
  const togglePage = (pageNum) => {
    setRemovedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageNum)) {
        next.delete(pageNum);
      } else {
        next.add(pageNum);
      }
      return next;
    });
  };

  // Mark all pages
  const handleSelectAll = () => {
    const all = new Set();
    for (let i = 1; i <= pageCount; i++) all.add(i);
    setRemovedPages(all);
  };

  // Deselect / restore all pages
  const handleRestoreAll = () => {
    setRemovedPages(new Set());
  };

  // Mark odd pages
  const handleSelectOdd = () => {
    setRemovedPages((prev) => {
      const next = new Set(prev);
      for (let i = 1; i <= pageCount; i += 2) next.add(i);
      return next;
    });
  };

  // Mark even pages
  const handleSelectEven = () => {
    setRemovedPages((prev) => {
      const next = new Set(prev);
      for (let i = 2; i <= pageCount; i += 2) next.add(i);
      return next;
    });
  };

  // Invert selection
  const handleInvert = () => {
    setRemovedPages((prev) => {
      const next = new Set();
      for (let i = 1; i <= pageCount; i++) {
        if (!prev.has(i)) next.add(i);
      }
      return next;
    });
  };

  // Apply custom range input
  const handleApplyRange = () => {
    if (!rangeInput.trim()) return;
    const pages = parseRangeString(rangeInput, pageCount);
    if (pages.length === 0) {
      setError('Please enter a valid page number or range (e.g., 1, 3-5, 8)');
      return;
    }
    setError('');
    setRemovedPages((prev) => {
      const next = new Set(prev);
      pages.forEach((p) => next.add(p));
      return next;
    });
    setSuccessMsg(`Marked ${pages.length} page${pages.length > 1 ? 's' : ''} for deletion.`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Keep ONLY custom range input (delete everything else)
  const handleKeepOnlyRange = () => {
    if (!rangeInput.trim()) return;
    const toKeep = new Set(parseRangeString(rangeInput, pageCount));
    if (toKeep.size === 0) {
      setError('Please enter a valid page number or range to keep.');
      return;
    }
    setError('');
    const toRemove = new Set();
    for (let i = 1; i <= pageCount; i++) {
      if (!toKeep.has(i)) toRemove.add(i);
    }
    setRemovedPages(toRemove);
    setSuccessMsg(`Set to keep ${toKeep.size} page${toKeep.size > 1 ? 's' : ''}; marked ${toRemove.size} for deletion.`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Zoom modal render
  const openPreview = useCallback(async (pageNum) => {
    if (!pdfDocument) return;
    setPreviewPage(pageNum);
    setPreviewModalImg('');
    try {
      const page = await pdfDocument.getPage(pageNum);
      const vp = page.getViewport({ scale: 1.6 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(vp.width);
      canvas.height = Math.ceil(vp.height);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      setPreviewModalImg(canvas.toDataURL('image/jpeg', 0.92));
    } catch (err) {
      console.error(err);
    }
  }, [pdfDocument]);

  // Export PDF with lossless vector copy
  const exportPdf = async () => {
    if (!file || pageCount === 0) return;
    const removedCount = removedPages.size;
    const remainingCount = pageCount - removedCount;

    if (remainingCount <= 0) {
      setError('Cannot delete all pages! You must keep at least 1 page in the PDF.');
      return;
    }

    if (removedCount === 0) {
      setError('No pages are selected for removal. Click on a page to mark it for deletion.');
      return;
    }

    setIsExporting(true);
    setError('');

    try {
      const sourceBytes = await file.arrayBuffer();
      const sourcePdf = await PDFDocument.load(sourceBytes);
      const outputPdf = await PDFDocument.create();

      // Collect 0-based indices of pages to keep
      const keepIndices = [];
      for (let p = 1; p <= pageCount; p++) {
        if (!removedPages.has(p)) {
          keepIndices.push(p - 1);
        }
      }

      // Copy pages losslessly (preserving vectors, fonts, crisp text, bookmarks)
      const copiedPages = await outputPdf.copyPages(sourcePdf, keepIndices);
      copiedPages.forEach((page) => outputPdf.addPage(page));

      const finalBytes = await outputPdf.save();
      const blob = new Blob([finalBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${file.name.replace(/\.pdf$/i, '')}-pages-removed.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      setSuccessMsg(`Successfully removed ${removedCount} page${removedCount > 1 ? 's' : ''}! New PDF downloaded.`);
      setTimeout(() => setSuccessMsg(''), 4500);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Could not export the PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const removedCount = removedPages.size;
  const remainingCount = pageCount - removedCount;
  const allPagesArray = Array.from({ length: pageCount }, (_, i) => i + 1);

  const filteredPages = allPagesArray.filter((p) => {
    if (filterMode === 'kept') return !removedPages.has(p);
    if (filterMode === 'removed') return removedPages.has(p);
    return true;
  });

  return (
    <div className="app-container reducer-page pdf-tool-page pdf-remove-page">
      <Navbar onHome={() => {}} theme={theme} toggleTheme={toggleTheme} hideEditorControls={true} />

      <main className="reducer-shell">
        <section className="reducer-workspace">
          {/* Header (shown only when no file is loaded) */}
          {!file && (
            <div className="reducer-heading">
              <div>
                <p>PDF Tools</p>
                <h1>Remove PDF Pages</h1>
              </div>
              <FileMinus size={34} className="desktop-only" />
            </div>
          )}

          {!file ? (
            /* Upload Hero Zone */
            <div className="pdf-merge-upload-hero">
              <p className="pdf-stacker-intro" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 1.5rem' }}>
                Delete unwanted pages from your PDF file. Click any page thumbnail to mark it for removal, use range shortcuts, and download your modified document.
              </p>
              <label className="pdf-merge-dropzone">
                <div className="pdf-merge-upload-icon-wrap" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
                  <Trash2 size={32} />
                </div>
                <strong style={{ fontSize: '1.25rem' }}>Select PDF to Edit</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Drag & drop or click to browse
                </span>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => handleFile(e.target.files)}
                  style={{ display: 'none' }}
                />
              </label>

              <div className="pdf-merge-features-badges">
                <div className="pdf-merge-badge-item">
                  <CheckCircle2 size={15} style={{ color: '#10b981' }} />
                  <span>100% Vector Quality</span>
                </div>
                <div className="pdf-merge-badge-item">
                  <Sparkles size={15} style={{ color: '#3b82f6' }} />
                  <span>Interactive Previews</span>
                </div>
                <div className="pdf-merge-badge-item">
                  <Trash2 size={15} style={{ color: '#ef4444' }} />
                  <span>Bulk Range Delete</span>
                </div>
                <div className="pdf-merge-badge-item">
                  <CheckCircle2 size={15} style={{ color: '#10b981' }} />
                  <span>Private Processing</span>
                </div>
              </div>
            </div>
          ) : (
            /* 2-Column Workspace */
            <div className="pdf-remove-workspace-layout">
              {/* Left Controls Sidebar */}
              <aside className="pdf-remove-sidebar">
                {/* File Info Card */}
                <div className="reducer-panel pdf-remove-card">
                  <div className="pdf-remove-file-header">
                    <div className="pdf-remove-file-icon">
                      <FileText size={20} />
                    </div>
                    <div className="pdf-remove-file-meta">
                      <strong title={file.name}>{file.name}</strong>
                      <span>{formatFileSize(file.size)} • {pageCount} pages</span>
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

                {/* Live Page Statistics */}
                <div className="reducer-panel pdf-remove-card">
                  <h3 className="pdf-remove-section-title">Summary</h3>
                  <div className="pdf-remove-stats-grid">
                    <div className="pdf-remove-stat-box">
                      <span>Total</span>
                      <strong>{pageCount}</strong>
                    </div>
                    <div className="pdf-remove-stat-box delete">
                      <span>Delete</span>
                      <strong>{removedCount}</strong>
                    </div>
                    <div className="pdf-remove-stat-box keep">
                      <span>Keep</span>
                      <strong>{remainingCount}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-primary pdf-remove-download-btn"
                    disabled={removedCount === 0 || remainingCount <= 0 || isExporting}
                    onClick={exportPdf}
                    style={{ background: '#ef4444', borderColor: '#dc2626' }}
                  >
                    {isExporting ? (
                      <>
                        <RefreshCw size={17} className="spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Download size={17} />
                        <span>
                          {removedCount === 0
                            ? 'Select pages'
                            : `Remove ${removedCount} Pages`}
                        </span>
                      </>
                    )}
                  </button>

                  {remainingCount <= 0 && (
                    <p className="pdf-remove-warning">
                      <AlertCircle size={14} />
                      <span>At least 1 page must remain.</span>
                    </p>
                  )}
                </div>

                {/* Quick Selection Helpers */}
                <div className="reducer-panel pdf-remove-card">
                  <h3 className="pdf-remove-section-title">Quick Select</h3>
                  <div className="pdf-remove-quick-actions">
                    <button
                      type="button"
                      className="pdf-remove-quick-btn"
                      onClick={handleSelectAll}
                      title="Mark all for deletion"
                    >
                      <CheckSquare size={14} />
                      <span>All</span>
                    </button>
                    <button
                      type="button"
                      className="pdf-remove-quick-btn"
                      onClick={handleRestoreAll}
                      title="Keep all"
                    >
                      <RotateCcw size={14} />
                      <span>Reset</span>
                    </button>
                    <button
                      type="button"
                      className="pdf-remove-quick-btn"
                      onClick={handleSelectOdd}
                    >
                      <span>Odd</span>
                    </button>
                    <button
                      type="button"
                      className="pdf-remove-quick-btn"
                      onClick={handleSelectEven}
                    >
                      <span>Even</span>
                    </button>
                    <button
                      type="button"
                      className="pdf-remove-quick-btn"
                      onClick={handleInvert}
                      style={{ gridColumn: 'span 2' }}
                    >
                      <RefreshCw size={14} />
                      <span>Invert Selection</span>
                    </button>
                  </div>
                </div>

                {/* Page Range Selector */}
                <div className="reducer-panel pdf-remove-card">
                  <h3 className="pdf-remove-section-title">By Page Range</h3>
                  <div className="pdf-remove-range-input-wrap">
                    <input
                      type="text"
                      className="pdf-remove-range-input"
                      placeholder="e.g. 1, 3-5, 8"
                      value={rangeInput}
                      onChange={(e) => setRangeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleApplyRange();
                      }}
                    />
                  </div>
                  <div className="pdf-remove-range-buttons">
                    <button
                      type="button"
                      className="pdf-remove-range-apply-btn"
                      onClick={handleApplyRange}
                    >
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </button>
                    <button
                      type="button"
                      className="pdf-remove-range-keep-btn"
                      onClick={handleKeepOnlyRange}
                      title="Keep only this range"
                    >
                      <span>Keep Only</span>
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="reducer-error pdf-remove-alert-box">
                    <AlertCircle size={15} />
                    <span>{error}</span>
                  </div>
                )}
                {successMsg && (
                  <div className="pdf-remove-success-box">
                    <CheckCircle2 size={15} />
                    <span>{successMsg}</span>
                  </div>
                )}
              </aside>

              {/* Right Main Gallery Area */}
              <section className="pdf-remove-gallery-panel">
                <div className="pdf-remove-gallery-toolbar">
                  <div className="pdf-remove-filter-tabs">
                    <button
                      type="button"
                      className={`pdf-remove-tab-btn ${filterMode === 'all' ? 'active' : ''}`}
                      onClick={() => setFilterMode('all')}
                    >
                      All ({pageCount})
                    </button>
                    <button
                      type="button"
                      className={`pdf-remove-tab-btn ${filterMode === 'kept' ? 'active' : ''}`}
                      onClick={() => setFilterMode('kept')}
                    >
                      Keep ({remainingCount})
                    </button>
                    <button
                      type="button"
                      className={`pdf-remove-tab-btn ${filterMode === 'removed' ? 'active' : ''}`}
                      onClick={() => setFilterMode('removed')}
                    >
                      Delete ({removedCount})
                    </button>
                  </div>

                  <div className="pdf-remove-grid-controls desktop-only">
                    <span className="pdf-remove-size-label">Grid:</span>
                    <button
                      type="button"
                      className={`pdf-remove-size-btn ${gridSize === 'small' ? 'active' : ''}`}
                      onClick={() => setGridSize('small')}
                    >
                      S
                    </button>
                    <button
                      type="button"
                      className={`pdf-remove-size-btn ${gridSize === 'medium' ? 'active' : ''}`}
                      onClick={() => setGridSize('medium')}
                    >
                      M
                    </button>
                    <button
                      type="button"
                      className={`pdf-remove-size-btn ${gridSize === 'large' ? 'active' : ''}`}
                      onClick={() => setGridSize('large')}
                    >
                      L
                    </button>
                  </div>
                </div>

                <div className={`pdf-remove-grid size-${gridSize}`}>
                  {filteredPages.map((pageNum) => {
                    const isRemoved = removedPages.has(pageNum);
                    const thumbUrl = thumbnails[pageNum];

                    return (
                      <article
                        key={pageNum}
                        className={`pdf-remove-page-card ${isRemoved ? 'is-removed' : 'is-kept'}`}
                        onClick={() => togglePage(pageNum)}
                      >
                        <div className="pdf-remove-card-header">
                          <span className="pdf-remove-card-number">Page {pageNum}</span>
                          <span className={`pdf-remove-status-pill ${isRemoved ? 'removed' : 'kept'}`}>
                            {isRemoved ? 'Delete' : 'Keep'}
                          </span>
                        </div>

                        <div className="pdf-remove-thumb-stage">
                          {thumbUrl ? (
                            <img
                              src={thumbUrl}
                              alt={`Page ${pageNum}`}
                              className="pdf-remove-thumb-img"
                              loading="lazy"
                            />
                          ) : (
                            <div className="pdf-remove-thumb-loading">
                              <RefreshCw size={18} className="spin" />
                            </div>
                          )}

                          {isRemoved && (
                            <div className="pdf-remove-overlay">
                              <div className="pdf-remove-overlay-badge">
                                <Trash2 size={20} />
                                <strong>Deleted</strong>
                              </div>
                            </div>
                          )}

                          <button
                            type="button"
                            className="pdf-remove-inspect-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              openPreview(pageNum);
                            }}
                          >
                            <Eye size={14} />
                          </button>

                          <button
                            type="button"
                            className={`pdf-remove-toggle-btn ${isRemoved ? 'restore' : 'delete'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePage(pageNum);
                            }}
                          >
                            {isRemoved ? <RotateCcw size={15} /> : <Trash2 size={15} />}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {filteredPages.length === 0 && (
                  <div className="pdf-remove-empty-state">
                    <p>No pages match the filter.</p>
                    <button
                      type="button"
                      className="pdf-remove-quick-btn"
                      onClick={() => setFilterMode('all')}
                      style={{ marginTop: '0.75rem' }}
                    >
                      Show All Pages
                    </button>
                  </div>
                )}
              </section>
            </div>
          )}
        </section>
      </main>

      {/* Enlarged Inspection Modal */}
      {previewPage && (
        <div className="pdf-remove-modal-backdrop" onClick={() => setPreviewPage(null)}>
          <div className="pdf-remove-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="pdf-remove-modal-header">
              <div className="pdf-remove-modal-title">
                <strong>Page {previewPage} of {pageCount}</strong>
                <span className={`pdf-remove-status-pill ${removedPages.has(previewPage) ? 'removed' : 'kept'}`}>
                  {removedPages.has(previewPage) ? 'Marked for Deletion' : 'Kept in Document'}
                </span>
              </div>

              <div className="pdf-remove-modal-actions">
                <button
                  type="button"
                  className={`pdf-remove-modal-toggle-btn ${removedPages.has(previewPage) ? 'restore' : 'delete'}`}
                  onClick={() => togglePage(previewPage)}
                >
                  {removedPages.has(previewPage) ? (
                    <>
                      <RotateCcw size={15} />
                      <span>Restore Page</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={15} />
                      <span>Delete Page</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="pdf-remove-modal-close"
                  onClick={() => setPreviewPage(null)}
                  title="Close preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="pdf-remove-modal-body">
              {previewModalImg ? (
                <img src={previewModalImg} alt={`Page ${previewPage}`} className="pdf-remove-modal-img" />
              ) : (
                <div className="pdf-remove-thumb-loading" style={{ minHeight: '300px' }}>
                  <RefreshCw size={24} className="spin" />
                  <span>Loading full resolution preview...</span>
                </div>
              )}
            </div>

            <div className="pdf-remove-modal-footer">
              <button
                type="button"
                className="btn-secondary"
                disabled={previewPage <= 1}
                onClick={() => openPreview(previewPage - 1)}
              >
                <ChevronLeft size={16} />
                <span>Previous Page</span>
              </button>

              <button
                type="button"
                className="btn-secondary"
                disabled={previewPage >= pageCount}
                onClick={() => openPreview(previewPage + 1)}
              >
                <span>Next Page</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PdfRemovePagesPage;

