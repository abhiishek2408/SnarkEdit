import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument } from 'pdf-lib';
import {
  Upload,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Download,
  FileText,
  Files,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowUpDown,
  RotateCcw,
  Sliders,
  ExternalLink,
  Layers,
  FileCheck,
  X,
  RefreshCw,
} from 'lucide-react';
import Navbar from '../components/Navbar';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const formatBytes = (bytes) => {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

// Parse page range strings like "1-3, 5, 7-10" into 0-based page indices
const parsePageRange = (rangeStr, totalPages) => {
  if (!rangeStr || typeof rangeStr !== 'string' || !rangeStr.trim()) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }

  const clean = rangeStr.trim().toLowerCase();
  if (clean === 'all') {
    return Array.from({ length: totalPages }, (_, i) => i);
  }

  const indices = new Set();
  const parts = clean.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (!isNaN(start) && !isNaN(end)) {
        const min = Math.max(1, Math.min(start, end));
        const max = Math.min(totalPages, Math.max(start, end));
        for (let p = min; p <= max; p++) {
          indices.add(p - 1);
        }
      }
    } else {
      const p = parseInt(trimmed, 10);
      if (!isNaN(p) && p >= 1 && p <= totalPages) {
        indices.add(p - 1);
      }
    }
  }

  const sorted = Array.from(indices).sort((a, b) => a - b);
  return sorted.length > 0 ? sorted : Array.from({ length: totalPages }, (_, i) => i);
};

const PdfMergerPage = ({ theme, toggleTheme }) => {
  const [files, setFiles] = useState([]);
  const [outputFilename, setOutputFilename] = useState('merged-document.pdf');
  const [isMerging, setIsMerging] = useState(false);
  const [mergedResult, setMergedResult] = useState(null); // { blob, size, pageCount, url }
  const [error, setError] = useState('');
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);

  const fileInputRef = useRef(null);
  const appendInputRef = useRef(null);

  // Generate thumbnail and pageCount for a PDF file
  const processPdfFile = useCallback(async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: arrayBuffer.slice(0) }).promise;
      const numPages = doc.numPages;

      let thumbnail = null;
      try {
        const page1 = await doc.getPage(1);
        const viewport = page1.getViewport({ scale: 1 });
        // Scale to approx 160-200px width for fast crisp thumbnails
        const scale = Math.min(1.0, 200 / viewport.width);
        const thumbViewport = page1.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = thumbViewport.width;
        canvas.height = thumbViewport.height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page1.render({ canvasContext: ctx, viewport: thumbViewport }).promise;
        thumbnail = canvas.toDataURL('image/jpeg', 0.82);
      } catch (thumbErr) {
        console.warn('Could not generate thumbnail for', file.name, thumbErr);
      }

      return {
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        name: file.name,
        size: file.size,
        pageCount: numPages,
        thumbnail,
        rangeType: 'all', // 'all' | 'custom'
        customRange: `1-${numPages}`,
        pageIndices: Array.from({ length: numPages }, (_, i) => i),
        isLoading: false,
        error: null,
      };
    } catch (err) {
      console.error('Failed to parse PDF:', file.name, err);
      return {
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        name: file.name,
        size: file.size,
        pageCount: 1,
        thumbnail: null,
        rangeType: 'all',
        customRange: '',
        pageIndices: [0],
        isLoading: false,
        error: 'Could not load PDF: ' + (err.message || 'Corrupted or password-protected'),
      };
    }
  }, []);

  // Add files
  const handleAddFiles = async (newFileList) => {
    if (!newFileList || !newFileList.length) return;

    setError('');
    setMergedResult(null);

    const pdfOnly = Array.from(newFileList).filter(f => (
      f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    ));

    if (!pdfOnly.length) {
      setError('Please select valid PDF files (.pdf).');
      return;
    }

    const processed = await Promise.all(pdfOnly.map(processPdfFile));
    setFiles(prev => [...prev, ...processed]);
  };

  // Reordering files
  const moveFile = (index, delta) => {
    setFiles(prev => {
      const targetIndex = index + delta;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
    setMergedResult(null);
  };

  // Drag and drop reordering
  const handleDragStart = (e, index) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverCard = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIdx !== index) {
      setDragOverIdx(index);
    }
  };

  const handleDropCard = (e, targetIndex) => {
    e.preventDefault();
    setDragOverIdx(null);
    const sourceIndexStr = e.dataTransfer.getData('text/plain');
    if (!sourceIndexStr) return;
    const sourceIndex = parseInt(sourceIndexStr, 10);
    if (isNaN(sourceIndex) || sourceIndex === targetIndex) return;

    setFiles(prev => {
      const next = [...prev];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setMergedResult(null);
  };

  // Remove individual file
  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setMergedResult(null);
  };

  // Clear all
  const clearAllFiles = () => {
    if (mergedResult?.url) {
      URL.revokeObjectURL(mergedResult.url);
    }
    setFiles([]);
    setMergedResult(null);
    setError('');
  };

  // Sort files
  const sortFilesByName = (ascending = true) => {
    setFiles(prev => {
      const next = [...prev];
      next.sort((a, b) => (
        ascending
          ? a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
          : b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: 'base' })
      ));
      return next;
    });
    setMergedResult(null);
  };

  const reverseFiles = () => {
    setFiles(prev => [...prev].reverse());
    setMergedResult(null);
  };

  // Update page selection mode / custom range
  const updateRangeType = (id, type) => {
    setFiles(prev => prev.map(item => {
      if (item.id !== id) return item;
      const nextType = type;
      const indices = nextType === 'all'
        ? Array.from({ length: item.pageCount }, (_, i) => i)
        : parsePageRange(item.customRange || `1-${item.pageCount}`, item.pageCount);

      return {
        ...item,
        rangeType: nextType,
        pageIndices: indices,
      };
    }));
    setMergedResult(null);
  };

  const updateCustomRange = (id, rangeText) => {
    setFiles(prev => prev.map(item => {
      if (item.id !== id) return item;
      const indices = parsePageRange(rangeText, item.pageCount);
      return {
        ...item,
        customRange: rangeText,
        pageIndices: indices,
      };
    }));
    setMergedResult(null);
  };

  // Totals calculations
  const totalStats = useMemo(() => {
    const count = files.length;
    const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
    const totalPagesToMerge = files.reduce((acc, f) => {
      if (f.rangeType === 'custom') {
        return acc + (f.pageIndices?.length || 0);
      }
      return acc + (f.pageCount || 0);
    }, 0);

    return {
      count,
      totalBytes,
      totalPagesToMerge,
    };
  }, [files]);

  // Execute Lossless PDF Merge using pdf-lib
  const handleMergePdf = async () => {
    if (files.length < 2) {
      setError('Please add at least 2 PDF files to merge.');
      return;
    }

    setIsMerging(true);
    setError('');

    try {
      const outputPdf = await PDFDocument.create();

      for (let i = 0; i < files.length; i++) {
        const item = files[i];
        if (item.error) {
          throw new Error(`Cannot merge "${item.name}": ${item.error}`);
        }

        const buffer = await item.file.arrayBuffer();
        const sourcePdf = await PDFDocument.load(buffer, { ignoreEncryption: true });

        const indices = item.rangeType === 'custom' && item.pageIndices && item.pageIndices.length > 0
          ? item.pageIndices
          : Array.from({ length: sourcePdf.getPageCount() }, (_, p) => p);

        if (!indices.length) {
          throw new Error(`File "${item.name}" has 0 pages selected.`);
        }

        const copiedPages = await outputPdf.copyPages(sourcePdf, indices);
        copiedPages.forEach((page) => outputPdf.addPage(page));
      }

      const mergedBytes = await outputPdf.save();
      const blob = new Blob([mergedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      setMergedResult({
        blob,
        url,
        size: blob.size,
        pageCount: outputPdf.getPageCount(),
      });
    } catch (err) {
      console.error('Merge error:', err);
      setError(err.message || 'An error occurred while merging your PDF files. Please try again.');
    } finally {
      setIsMerging(false);
    }
  };

  // Download merged PDF
  const handleDownload = () => {
    if (!mergedResult?.blob) return;

    let filename = outputFilename.trim();
    if (!filename) filename = 'merged-document.pdf';
    if (!filename.toLowerCase().endsWith('.pdf')) filename += '.pdf';

    const url = URL.createObjectURL(mergedResult.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (mergedResult?.url) {
        URL.revokeObjectURL(mergedResult.url);
      }
    };
  }, [mergedResult]);

  return (
    <div
      className="app-container reducer-page pdf-tool-page pdf-merge-page"
      onDragEnter={(e) => {
        e.preventDefault();
        setIsGlobalDragging(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsGlobalDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        if (e.relatedTarget === null) {
          setIsGlobalDragging(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsGlobalDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length) {
          handleAddFiles(e.dataTransfer.files);
        }
      }}
    >
      <Navbar onHome={() => {}} theme={theme} toggleTheme={toggleTheme} hideEditorControls={true} />

      <main className="reducer-shell">
        <section className="reducer-workspace">
          {/* Header (shown only when no files are loaded) */}
          {!files.length && (
            <div className="reducer-heading">
              <div>
                <p>PDF Tools</p>
                <h1>Merge PDF Files</h1>
              </div>
              <Files size={34} className="desktop-only" />
            </div>
          )}

          {!files.length ? (
            <div className="pdf-merge-upload-hero">
              <p className="pdf-stacker-intro" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 1.5rem' }}>
                Combine multiple PDF files into a single document in your chosen order. Lossless, fast, and 100% private in your browser.
              </p>
              <label className="pdf-merge-dropzone">
                <div className="pdf-merge-upload-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}>
                  <Upload size={32} />
                </div>
                <strong>Select multiple PDF files to merge</strong>
                <span>Drag & drop PDF files here, or click to browse</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  multiple
                  onChange={(e) => handleAddFiles(e.target.files)}
                  style={{ display: 'none' }}
                />
              </label>

              <div className="pdf-merge-features-badges">
                <div className="pdf-merge-badge-item">
                  <Sparkles size={16} />
                  <span>100% Lossless Quality</span>
                </div>
                <div className="pdf-merge-badge-item">
                  <CheckCircle2 size={16} />
                  <span>Custom Page Ranges</span>
                </div>
                <div className="pdf-merge-badge-item">
                  <ArrowUpDown size={16} />
                  <span>Drag & Drop Order</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="pdf-merge-layout">
              {/* Left Column: Controls Sidebar */}
              <aside className="pdf-merge-sidebar">
                {/* File Summary Card */}
                <div className="reducer-panel pdf-remove-card">
                  <h3 className="pdf-remove-section-title">Merge Summary</h3>
                  <div className="pdf-split-stats-box" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                    <div className="pdf-split-stat-row">
                      <span>Files:</span>
                      <strong>{totalStats.count}</strong>
                    </div>
                    <div className="pdf-split-stat-row">
                      <span>Total Pages:</span>
                      <strong>{totalStats.totalPagesToMerge}</strong>
                    </div>
                    <div className="pdf-split-stat-row highlight">
                      <span>Combined Size:</span>
                      <strong>{formatBytes(totalStats.totalBytes)}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="pdf-remove-change-btn"
                    onClick={() => appendInputRef.current?.click()}
                  >
                    <Plus size={14} />
                    <span>Add More PDFs</span>
                  </button>
                  <input
                    ref={appendInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => handleAddFiles(e.target.files)}
                  />
                </div>

                {/* Settings Card */}
                <div className="reducer-panel pdf-remove-card">
                  <h3 className="pdf-remove-section-title">Settings</h3>

                  <div className="pdf-split-field">
                    <label htmlFor="merged-filename">Output Filename:</label>
                    <input
                      id="merged-filename"
                      type="text"
                      value={outputFilename}
                      onChange={(e) => setOutputFilename(e.target.value)}
                      placeholder="merged-document.pdf"
                      className="pdf-merge-name-input"
                    />
                  </div>

                  <div className="pdf-merge-actions-group">
                    <div className="pdf-merge-group-label">Quick Actions:</div>
                    <div className="pdf-merge-sort-buttons">
                      <button
                        type="button"
                        className="pdf-remove-quick-btn"
                        onClick={() => sortFilesByName(true)}
                        title="Sort A to Z"
                      >
                        <span>A→Z</span>
                      </button>
                      <button
                        type="button"
                        className="pdf-remove-quick-btn"
                        onClick={reverseFiles}
                        title="Reverse order"
                      >
                        <RotateCcw size={13} />
                        <span>Reverse</span>
                      </button>
                      <button
                        type="button"
                        className="pdf-remove-quick-btn"
                        onClick={clearAllFiles}
                        style={{ color: '#ef4444' }}
                      >
                        <Trash2 size={13} />
                        <span>Clear</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Primary Merge Action */}
                <div className="pdf-merge-action-zone">
                  {error && (
                    <div className="reducer-error" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                      <AlertCircle size={16} />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn-primary pdf-remove-download-btn"
                    onClick={handleMergePdf}
                    disabled={isMerging || files.length < 2}
                    style={{ background: 'var(--primary)', borderColor: 'var(--primary-hover)', color: 'white', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)' }}
                  >
                    {isMerging ? (
                      <>
                        <RefreshCw size={18} className="spin" />
                        <span>Merging PDFs...</span>
                      </>
                    ) : (
                      <>
                        <Files size={18} />
                        <span>Merge {files.length} PDFs</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Success Download Card */}
                {mergedResult && (
                  <div className="pdf-merge-success-card">
                    <div className="pdf-merge-success-header">
                      <CheckCircle2 size={20} color="#10b981" />
                      <div>
                        <strong>Merge Complete!</strong>
                        <span>{mergedResult.pageCount} pages · {formatBytes(mergedResult.size)}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="pdf-merge-download-btn"
                      onClick={handleDownload}
                    >
                      <Download size={18} />
                      <span>Download PDF</span>
                    </button>
                  </div>
                )}
              </aside>

              {/* Right Column: Visual PDF Cards Grid */}
              <section className="pdf-remove-gallery-panel">
                <div className="pdf-merge-cards-header">
                  <strong>PDFs to Merge ({files.length})</strong>
                  <span className="pdf-split-hint-text desktop-only">
                    ↔ Drag cards to change sequence
                  </span>
                </div>

                <div className="pdf-merge-grid" style={{ marginTop: '1rem' }}>
                  {files.map((item, index) => {
                    const isDraggingThis = dragOverIdx === index;
                    const selectedCount = item.rangeType === 'custom'
                      ? item.pageIndices.length
                      : item.pageCount;

                    return (
                      <div
                        key={item.id}
                        className={`pdf-merge-card ${isDraggingThis ? 'drag-over' : ''} ${item.error ? 'has-error' : ''}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOverCard(e, index)}
                        onDrop={(e) => handleDropCard(e, index)}
                        onDragEnd={() => setDragOverIdx(null)}
                      >
                        <div className="pdf-merge-card-badge">
                          #{index + 1}
                        </div>

                        <div className="pdf-merge-thumb-wrap">
                          {item.thumbnail ? (
                            <img src={item.thumbnail} alt={item.name} />
                          ) : (
                            <div className="pdf-merge-thumb-fallback">
                              <FileText size={32} />
                              <span>{item.error ? 'Error' : 'PDF'}</span>
                            </div>
                          )}
                        </div>

                        <div className="pdf-merge-card-details">
                          <strong className="pdf-merge-card-title" title={item.name}>
                            {item.name}
                          </strong>

                          <div className="pdf-merge-card-meta">
                            <span className="pdf-merge-meta-pill">
                              {item.pageCount} {item.pageCount === 1 ? 'page' : 'pages'}
                            </span>
                            <span className="pdf-merge-meta-size">
                              {formatBytes(item.size)}
                            </span>
                          </div>

                          <div className="pdf-merge-range-selector">
                            <div className="pdf-merge-range-radios">
                              <label className="pdf-merge-radio-label">
                                <input
                                  type="radio"
                                  name={`range-${item.id}`}
                                  checked={item.rangeType === 'all'}
                                  onChange={() => updateRangeType(item.id, 'all')}
                                />
                                <span>All</span>
                              </label>

                              <label className="pdf-merge-radio-label">
                                <input
                                  type="radio"
                                  name={`range-${item.id}`}
                                  checked={item.rangeType === 'custom'}
                                  onChange={() => updateRangeType(item.id, 'custom')}
                                />
                                <span>Range</span>
                              </label>
                            </div>

                            {item.rangeType === 'custom' && (
                              <div className="pdf-merge-custom-input-wrap">
                                <input
                                  type="text"
                                  value={item.customRange}
                                  onChange={(e) => updateCustomRange(item.id, e.target.value)}
                                  placeholder="e.g. 1-3, 5"
                                  className="pdf-merge-custom-range-input"
                                />
                                <small className="pdf-merge-range-hint">
                                  {selectedCount} selected
                                </small>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="pdf-merge-card-actions">
                          <button
                            type="button"
                            className="pdf-merge-move-btn"
                            disabled={index === 0}
                            onClick={() => moveFile(index, -1)}
                          >
                            <ArrowUp size={14} />
                          </button>

                          <button
                            type="button"
                            className="pdf-merge-move-btn"
                            disabled={index === files.length - 1}
                            onClick={() => moveFile(index, 1)}
                          >
                            <ArrowDown size={14} />
                          </button>

                          <button
                            type="button"
                            className="pdf-merge-delete-btn"
                            onClick={() => removeFile(item.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default PdfMergerPage;

