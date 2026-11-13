import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import {
  Upload,
  Download,
  Trash2,
  RotateCw,
  Plus,
  PlusCircle,
  FileText,
  Files,
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  Copy,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Undo2,
  FilePlus,
  LayoutGrid,
  Eye,
  X,
  Check,
} from 'lucide-react';
import Navbar from '../components/Navbar';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const formatFileSize = (bytes) => {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const PdfOrganizePage = ({ theme, toggleTheme }) => {
  const [initialFile, setInitialFile] = useState(null);
  const [pages, setPages] = useState([]); // Array of PageItem objects
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [history, setHistory] = useState([]); // Undo history stacks of pages
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [zoomSize, setZoomSize] = useState('medium'); // 'small', 'medium', 'large'
  const [activeInsertMenuIndex, setActiveInsertMenuIndex] = useState(null); // slot index where menu is open
  const [previewModalItem, setPreviewModalItem] = useState(null);

  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Hidden file inputs
  const initialFileInputRef = useRef(null);
  const appendFileInputRef = useRef(null);
  const insertFileInputRef = useRef(null);
  const targetInsertSlotRef = useRef(null);

  // In-memory cache for loaded source PDFs: sourceId -> { name, data, doc: pdfjsDoc }
  const sourceDocsRef = useRef(new Map());
  const cancelThumbnailsRef = useRef(false);

  // Push state to undo history
  const pushHistory = (currentPages) => {
    setHistory((prev) => [...prev.slice(-20), currentPages]);
  };

  const undo = () => {
    if (!history.length) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setPages(previous);
  };

  // Render thumbnail for a specific page item
  const renderThumbnail = async (sourceDoc, pageNum, rotation = 0) => {
    try {
      const page = await sourceDoc.getPage(pageNum);
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
      return canvas.toDataURL('image/jpeg', 0.88);
    } catch (e) {
      console.warn('Could not render thumbnail:', e);
      return '';
    }
  };

  // Process and load an uploaded PDF file into the cache and return new page items
  const parsePdfFile = async (fileObj, sourceId) => {
    const data = new Uint8Array(await fileObj.arrayBuffer());
    const doc = await pdfjs.getDocument({ data: data.slice() }).promise;
    sourceDocsRef.current.set(sourceId, {
      name: fileObj.name,
      data,
      doc,
      pageCount: doc.numPages,
    });

    const newItems = [];
    for (let i = 1; i <= doc.numPages; i++) {
      newItems.push({
        id: `page-${sourceId}-${i}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sourceType: 'pdf',
        sourceId,
        sourceFileName: fileObj.name,
        sourcePageIndex: i - 1, // 0-based for pdf-lib
        originalPageNum: i,
        rotation: 0,
        thumbnailUrl: '',
      });
    }
    return { doc, newItems };
  };

  // Initial file handler
  const handleInitialFile = async (files) => {
    const file = files?.[0];
    if (!file) return;

    cancelThumbnailsRef.current = true;
    setError('');
    setSuccessMsg('');
    setHistory([]);
    setSelectedIds(new Set());

    try {
      const sourceId = 'orig-' + Date.now();
      sourceDocsRef.current.clear();
      const { doc, newItems } = await parsePdfFile(file, sourceId);
      setInitialFile(file);
      setPages(newItems);
      cancelThumbnailsRef.current = false;

      // Progressively populate thumbnails
      for (let i = 0; i < newItems.length; i++) {
        if (cancelThumbnailsRef.current) break;
        const url = await renderThumbnail(doc, newItems[i].originalPageNum);
        if (cancelThumbnailsRef.current) break;
        setPages((curr) =>
          curr.map((p, idx) => (idx === i ? { ...p, thumbnailUrl: url } : p))
        );
      }
    } catch (err) {
      console.error(err);
      setError('Could not open this PDF. Please check if the file is valid or password-protected.');
    }
  };

  // Append new PDF files at the end of the document
  const handleAppendFiles = async (files) => {
    if (!files || !files.length) return;
    pushHistory(pages);
    setError('');

    try {
      for (const f of Array.from(files)) {
        const sourceId = `extra-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const { doc, newItems } = await parsePdfFile(f, sourceId);
        setPages((curr) => [...curr, ...newItems]);

        // Progressively render thumbnails for added pages
        for (let i = 0; i < newItems.length; i++) {
          const url = await renderThumbnail(doc, newItems[i].originalPageNum);
          setPages((curr) =>
            curr.map((p) => (p.id === newItems[i].id ? { ...p, thumbnailUrl: url } : p))
          );
        }
      }
      setSuccessMsg(`Added pages from ${files.length} file(s).`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Could not add pages from selected file(s).');
    }
  };

  // Insert PDF files at a specific index
  const handleInsertPdfAtSlot = async (files, slotIndex) => {
    if (!files || !files.length) return;
    pushHistory(pages);
    setError('');
    setActiveInsertMenuIndex(null);

    try {
      let insertAt = slotIndex;
      for (const f of Array.from(files)) {
        const sourceId = `slot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const { doc, newItems } = await parsePdfFile(f, sourceId);

        setPages((curr) => {
          const next = [...curr];
          next.splice(insertAt, 0, ...newItems);
          return next;
        });
        insertAt += newItems.length;

        // Progressively render thumbnails
        for (let i = 0; i < newItems.length; i++) {
          const url = await renderThumbnail(doc, newItems[i].originalPageNum);
          setPages((curr) =>
            curr.map((p) => (p.id === newItems[i].id ? { ...p, thumbnailUrl: url } : p))
          );
        }
      }
      setSuccessMsg(`Inserted pages successfully!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Could not insert pages from selected file.');
    }
  };

  // Insert a blank page at a specific slot index
  const insertBlankPageAtSlot = (slotIndex) => {
    pushHistory(pages);
    const blankItem = {
      id: `blank-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sourceType: 'blank',
      sourceId: 'blank',
      sourceFileName: 'Blank Sheet',
      sourcePageIndex: -1,
      originalPageNum: 0,
      rotation: 0,
      thumbnailUrl: '',
    };
    setPages((curr) => {
      const next = [...curr];
      next.splice(slotIndex, 0, blankItem);
      return next;
    });
    setActiveInsertMenuIndex(null);
  };

  // Page reordering (move from index to index)
  const movePage = (fromIndex, toIndex) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || toIndex >= pages.length) return;
    pushHistory(pages);
    setPages((curr) => {
      const next = [...curr];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  // Delete an individual page
  const deletePage = (id) => {
    pushHistory(pages);
    setPages((curr) => curr.filter((p) => p.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Duplicate a page
  const duplicatePage = (index) => {
    const target = pages[index];
    if (!target) return;
    pushHistory(pages);
    const duplicated = {
      ...target,
      id: `copy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    };
    setPages((curr) => {
      const next = [...curr];
      next.splice(index + 1, 0, duplicated);
      return next;
    });
  };

  // Rotate a page (90° clockwise)
  const rotatePage = (id) => {
    setPages((curr) =>
      curr.map((p) => (p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p))
    );
  };

  // Rotate all pages 90° clockwise
  const rotateAllPages = () => {
    pushHistory(pages);
    setPages((curr) =>
      curr.map((p) => ({ ...p, rotation: (p.rotation + 90) % 360 }))
    );
  };

  // Multi-select toggle
  const toggleSelectPage = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Select / Deselect All
  const toggleSelectAll = () => {
    if (selectedIds.size === pages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pages.map((p) => p.id)));
    }
  };

  // Delete all selected pages
  const deleteSelectedPages = () => {
    if (!selectedIds.size) return;
    pushHistory(pages);
    setPages((curr) => curr.filter((p) => !selectedIds.has(p.id)));
    setSelectedIds(new Set());
  };

  // Rotate selected pages
  const rotateSelectedPages = () => {
    if (!selectedIds.size) return;
    pushHistory(pages);
    setPages((curr) =>
      curr.map((p) =>
        selectedIds.has(p.id) ? { ...p, rotation: (p.rotation + 90) % 360 } : p
      )
    );
  };

  // Reset to original PDF order
  const resetToOriginal = async () => {
    if (!initialFile) return;
    cancelThumbnailsRef.current = true;
    handleInitialFile([initialFile]);
  };

  // Drag and drop handlers for page cards
  const handleDragStart = (e, index) => {
    e.dataTransfer.setData('text/plain', index.toString());
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOverCard = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropCard = (e, index) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      movePage(draggedIndex, index);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Export organized PDF using pdf-lib
  const exportOrganizedPdf = async () => {
    if (!pages.length) return;
    setIsExporting(true);
    setError('');

    try {
      const output = await PDFDocument.create();

      // Pre-load pdf-lib PDFDocument instances for all unique sources
      const pdfLibCache = new Map();
      for (const [sourceId, cached] of sourceDocsRef.current.entries()) {
        const loadedDoc = await PDFDocument.load(cached.data, { ignoreEncryption: true });
        pdfLibCache.set(sourceId, loadedDoc);
      }

      for (const item of pages) {
        if (item.sourceType === 'blank') {
          // Standard A4 dimensions in points: 595.28 x 841.89
          const page = output.addPage([595.28, 841.89]);
          page.drawRectangle({
            x: 0,
            y: 0,
            width: 595.28,
            height: 841.89,
            color: rgb(1, 1, 1),
          });
        } else {
          const srcDoc = pdfLibCache.get(item.sourceId);
          if (!srcDoc) continue;
          const [copiedPage] = await output.copyPages(srcDoc, [item.sourcePageIndex]);
          const baseAngle = copiedPage.getRotation().angle;
          const finalAngle = (baseAngle + (item.rotation || 0)) % 360;
          copiedPage.setRotation(degrees(finalAngle));
          output.addPage(copiedPage);
        }
      }

      const bytes = await output.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const baseName = initialFile?.name?.replace(/\.pdf$/i, '') || 'document';
      link.download = `${baseName}-organized.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setSuccessMsg(`Organized PDF generated successfully (${pages.length} pages)!`);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Could not export the organized PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  // Close insert menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.pdf-organize-insert-slot')) {
        setActiveInsertMenuIndex(null);
      }
    };
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, []);

  const addedCount = pages.filter((p) => p.sourceId !== 'orig-' + (pages[0]?.sourceId?.split('-')?.[1] || '')).length;
  const rotatedCount = pages.filter((p) => (p.rotation || 0) !== 0).length;

  return (
    <div className="app-container reducer-page pdf-tool-page pdf-organize-page">
      <Navbar onHome={() => {}} theme={theme} toggleTheme={toggleTheme} hideEditorControls={true} />

      <main className="reducer-shell">
        <section className="reducer-workspace">
          {/* Header (shown only when no file is loaded) */}
          {!initialFile && (
            <div className="reducer-heading">
              <div>
                <p>PDF Tools</p>
                <h1>Organize PDF Pages</h1>
              </div>
              <LayoutGrid size={34} className="desktop-only" />
            </div>
          )}

          {!initialFile ? (
            /* Upload Hero Dropzone */
            <div className="pdf-merge-upload-hero">
              <p
                className="pdf-stacker-intro"
                style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 1.5rem' }}
              >
                Arrange, sort, and organize PDF pages effortlessly. Drag & drop to reorder, delete unwanted sheets, rotate orientations, or insert pages and blank sheets anywhere simultaneously.
              </p>

              <label
                className="pdf-merge-dropzone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.length) {
                    handleInitialFile(e.dataTransfer.files);
                  }
                }}
              >
                <div
                  className="pdf-merge-upload-icon-wrap"
                  style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}
                >
                  <Upload size={32} />
                </div>
                <strong style={{ fontSize: '1.25rem' }}>Select PDF to Organize</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Drag & drop PDF here, or click to browse
                </span>
                <input
                  ref={initialFileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => handleInitialFile(e.target.files)}
                  style={{ display: 'none' }}
                />
              </label>

              <div className="pdf-merge-features-badges">
                <div className="pdf-merge-badge-item">
                  <ArrowDownUp size={15} style={{ color: '#3b82f6' }} />
                  <span>Drag & Drop Reordering</span>
                </div>
                <div className="pdf-merge-badge-item">
                  <PlusCircle size={15} style={{ color: '#3b82f6' }} />
                  <span>Insert Pages Anywhere</span>
                </div>
                <div className="pdf-merge-badge-item">
                  <RotateCw size={15} style={{ color: '#3b82f6' }} />
                  <span>Rotate & Delete Pages</span>
                </div>
              </div>

              {error && <p className="reducer-error" style={{ textAlign: 'center', marginTop: '1rem' }}>{error}</p>}
            </div>
          ) : (
            /* Active Organizer Layout */
            <div className="pdf-remove-workspace-layout">
              {/* Left Sidebar: Controls & Summary */}
              <aside className="pdf-remove-sidebar">
                {/* File Information Card */}
                <div className="reducer-panel pdf-remove-card">
                  <div className="pdf-remove-file-header">
                    <div
                      className="pdf-remove-file-icon"
                      style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6' }}
                    >
                      <Files size={20} />
                    </div>
                    <div className="pdf-remove-file-meta">
                      <strong title={initialFile.name}>{initialFile.name}</strong>
                      <span>{formatFileSize(initialFile.size)}</span>
                    </div>
                  </div>
                  <button
                    className="pdf-remove-change-btn"
                    onClick={() => initialFileInputRef.current?.click()}
                  >
                    <RefreshCw size={14} />
                    <span>Change PDF</span>
                    <input
                      ref={initialFileInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={(e) => handleInitialFile(e.target.files)}
                      style={{ display: 'none' }}
                    />
                  </button>
                </div>

                {/* Document Stats & Actions */}
                <div className="reducer-panel pdf-remove-card">
                  <h3 className="pdf-remove-section-title">Document Summary</h3>

                  <div className="pdf-split-stats-box" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                    <div className="pdf-split-stat-row">
                      <span>Total Output Pages:</span>
                      <strong style={{ color: 'var(--primary)', fontSize: '1rem' }}>{pages.length}</strong>
                    </div>
                    {rotatedCount > 0 && (
                      <div className="pdf-split-stat-row">
                        <span>Rotated Pages:</span>
                        <strong>{rotatedCount}</strong>
                      </div>
                    )}
                  </div>

                  {/* Add Pages Globally Buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                    <button
                      className="pdf-remove-quick-btn pdf-stacker-add-btn"
                      type="button"
                      onClick={() => appendFileInputRef.current?.click()}
                    >
                      <FilePlus size={15} />
                      <span>Add More PDF Pages</span>
                      <input
                        ref={appendFileInputRef}
                        type="file"
                        accept="application/pdf,.pdf"
                        multiple
                        onChange={(e) => handleAppendFiles(e.target.files)}
                        style={{ display: 'none' }}
                      />
                    </button>

                    <button
                      className="pdf-remove-quick-btn"
                      type="button"
                      onClick={() => insertBlankPageAtSlot(pages.length)}
                    >
                      <Plus size={15} />
                      <span>Add Blank Page at End</span>
                    </button>
                  </div>

                  {/* Bulk Actions */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem', marginTop: '0.75rem' }}>
                    <button
                      className="pdf-remove-quick-btn"
                      type="button"
                      onClick={rotateAllPages}
                      title="Rotate all pages 90 degrees clockwise"
                    >
                      <RotateCw size={14} />
                      <span>Rotate All</span>
                    </button>

                    <button
                      className="pdf-remove-quick-btn"
                      type="button"
                      onClick={undo}
                      disabled={!history.length}
                      title="Undo last change"
                    >
                      <Undo2 size={14} />
                      <span>Undo</span>
                    </button>
                  </div>

                  {/* Reset Button */}
                  <button
                    className="pdf-remove-quick-btn"
                    type="button"
                    onClick={resetToOriginal}
                    style={{ marginTop: '0.5rem', borderStyle: 'dashed' }}
                  >
                    <RefreshCw size={14} />
                    <span>Reset Order & Edits</span>
                  </button>

                  {/* Export Button */}
                  <button
                    className="btn-primary pdf-organize-download-btn"
                    type="button"
                    onClick={exportOrganizedPdf}
                    disabled={!pages.length || isExporting}
                    style={{ marginTop: '1rem' }}
                  >
                    {isExporting ? (
                      <>
                        <RefreshCw size={17} className="spin" />
                        <span>Generating PDF...</span>
                      </>
                    ) : (
                      <>
                        <Download size={18} />
                        <span>Download PDF ({pages.length} Pages)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Helpful tips box */}
                <div className="pdf-crop-side-guide" style={{ background: 'var(--bg-card)' }}>
                  <strong>💡 Pro Tips:</strong>
                  <ol>
                    <li><strong>Drag cards</strong> to reorder pages in any sequence.</li>
                    <li>Click the <strong>+</strong> between cards to insert a blank page or import another PDF right there.</li>
                    <li>Hover on any card to <strong>Rotate</strong>, <strong>Duplicate</strong>, or <strong>Delete</strong>.</li>
                  </ol>
                </div>

                {error && (
                  <div className="reducer-error pdf-remove-alert-box">
                    <AlertCircle size={15} />
                    <span>{error}</span>
                  </div>
                )}

                {successMsg && (
                  <div
                    style={{
                      marginTop: '0.75rem',
                      padding: '0.75rem',
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid #10b981',
                      borderRadius: '8px',
                      color: '#10b981',
                      fontSize: '0.82rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>{successMsg}</span>
                  </div>
                )}
              </aside>

              {/* Right Gallery Workspace */}
              <section className="pdf-remove-gallery-panel pdf-organize-main-panel">
                {/* Top Workspace Toolbar */}
                <div className="pdf-organize-toolbar">
                  <div className="pdf-organize-toolbar-left">
                    <button
                      className="pdf-remove-quick-btn"
                      type="button"
                      onClick={toggleSelectAll}
                    >
                      <Check size={14} />
                      <span>{selectedIds.size === pages.length ? 'Deselect All' : 'Select All'}</span>
                    </button>

                    {selectedIds.size > 0 && (
                      <>
                        <button
                          className="pdf-remove-quick-btn"
                          type="button"
                          onClick={rotateSelectedPages}
                        >
                          <RotateCw size={14} />
                          <span>Rotate Selected ({selectedIds.size})</span>
                        </button>

                        <button
                          className="pdf-remove-quick-btn"
                          type="button"
                          onClick={deleteSelectedPages}
                          style={{ color: '#ef4444' }}
                        >
                          <Trash2 size={14} />
                          <span>Delete Selected ({selectedIds.size})</span>
                        </button>
                      </>
                    )}
                  </div>

                  <div className="pdf-organize-toolbar-right">
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Zoom:</span>
                    <div className="pdf-remove-size-toggles">
                      <button
                        type="button"
                        className={zoomSize === 'small' ? 'active' : ''}
                        onClick={() => setZoomSize('small')}
                      >
                        S
                      </button>
                      <button
                        type="button"
                        className={zoomSize === 'medium' ? 'active' : ''}
                        onClick={() => setZoomSize('medium')}
                      >
                        M
                      </button>
                      <button
                        type="button"
                        className={zoomSize === 'large' ? 'active' : ''}
                        onClick={() => setZoomSize('large')}
                      >
                        L
                      </button>
                    </div>
                  </div>
                </div>

                {/* Dark Gallery Stage just outside the pages */}
                <div className="pdf-organize-stage">
                  <div className={`pdf-organize-grid size-${zoomSize}`}>
                    {/* Insert slot at the very beginning (index 0) */}
                    <InsertSlot
                      slotIndex={0}
                      isOpen={activeInsertMenuIndex === 0}
                      onToggleOpen={() =>
                        setActiveInsertMenuIndex(activeInsertMenuIndex === 0 ? null : 0)
                      }
                      onInsertBlank={() => insertBlankPageAtSlot(0)}
                      onTriggerFileInput={() => {
                        targetInsertSlotRef.current = 0;
                        insertFileInputRef.current?.click();
                      }}
                    />

                    {pages.map((item, index) => {
                      const isSelected = selectedIds.has(item.id);
                      const isDragged = draggedIndex === index;
                      const isDragOver = dragOverIndex === index;

                      return (
                        <React.Fragment key={item.id}>
                          {/* Page Thumbnail Card */}
                          <div
                            className={`pdf-organize-card ${isSelected ? 'selected' : ''} ${isDragged ? 'is-dragged' : ''} ${isDragOver ? 'is-drag-over' : ''}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => handleDragOverCard(e, index)}
                            onDrop={(e) => handleDropCard(e, index)}
                            onDragEnd={handleDragEnd}
                          >
                            {/* Card Header Bar */}
                            <div className="pdf-organize-card-header">
                              <label className="pdf-organize-checkbox-label" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectPage(item.id)}
                                />
                                <span className="pdf-organize-badge">#{index + 1}</span>
                              </label>

                              <span
                                className="pdf-organize-source-tag"
                                title={item.sourceFileName}
                              >
                                {item.sourceType === 'blank'
                                  ? 'Blank'
                                  : item.sourceFileName?.length > 12
                                  ? `${item.sourceFileName.slice(0, 10)}...`
                                  : item.sourceFileName}
                              </span>

                              <button
                                className="pdf-organize-card-zoom-btn"
                                type="button"
                                title="Enlarge preview"
                                onClick={() => setPreviewModalItem(item)}
                              >
                                <Eye size={13} />
                              </button>
                            </div>

                            {/* Card Thumbnail Canvas / Image */}
                            <div className="pdf-organize-card-preview">
                              {item.sourceType === 'blank' ? (
                                <div className="pdf-organize-blank-sheet">
                                  <FileText size={32} opacity={0.3} />
                                  <span>Blank Sheet</span>
                                </div>
                              ) : item.thumbnailUrl ? (
                                <img
                                  src={item.thumbnailUrl}
                                  alt={`Page ${index + 1}`}
                                  style={{
                                    transform: `rotate(${item.rotation}deg)`,
                                    transition: 'transform 0.2s ease',
                                  }}
                                />
                              ) : (
                                <div className="pdf-preview-loading">
                                  <RefreshCw size={18} className="spin" />
                                  <span>Loading...</span>
                                </div>
                              )}
                            </div>

                            {/* Card Footer Actions */}
                            <div className="pdf-organize-card-actions">
                              <button
                                type="button"
                                title="Move left / earlier"
                                disabled={index === 0}
                                onClick={() => movePage(index, index - 1)}
                              >
                                <ChevronLeft size={16} />
                              </button>

                              <button
                                type="button"
                                title="Rotate 90 degrees"
                                onClick={() => rotatePage(item.id)}
                              >
                                <RotateCw size={14} />
                              </button>

                              <button
                                type="button"
                                title="Duplicate page"
                                onClick={() => duplicatePage(index)}
                              >
                                <Copy size={14} />
                              </button>

                              <button
                                type="button"
                                title="Move right / later"
                                disabled={index === pages.length - 1}
                                onClick={() => movePage(index, index + 1)}
                              >
                                <ChevronRight size={16} />
                              </button>

                              <button
                                type="button"
                                className="pdf-organize-delete-btn"
                                title="Delete page"
                                onClick={() => deletePage(item.id)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Insert slot after this card */}
                          <InsertSlot
                            slotIndex={index + 1}
                            isOpen={activeInsertMenuIndex === index + 1}
                            onToggleOpen={() =>
                              setActiveInsertMenuIndex(
                                activeInsertMenuIndex === index + 1 ? null : index + 1
                              )
                            }
                            onInsertBlank={() => insertBlankPageAtSlot(index + 1)}
                            onTriggerFileInput={() => {
                              targetInsertSlotRef.current = index + 1;
                              insertFileInputRef.current?.click();
                            }}
                          />
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* Hidden File Input for targeted slot insertion */}
                <input
                  ref={insertFileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (targetInsertSlotRef.current !== null && e.target.files) {
                      handleInsertPdfAtSlot(e.target.files, targetInsertSlotRef.current);
                    }
                  }}
                />
              </section>
            </div>
          )}
        </section>
      </main>

      {/* Enlarged Page Preview Modal */}
      {previewModalItem && (
        <div
          className="pdf-draw-modal-backdrop"
          onClick={() => setPreviewModalItem(null)}
        >
          <div
            className="pdf-organize-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pdf-organize-modal-header">
              <strong>Page Preview</strong>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setPreviewModalItem(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="pdf-organize-modal-body">
              {previewModalItem.sourceType === 'blank' ? (
                <div className="pdf-organize-blank-sheet modal">
                  <FileText size={64} opacity={0.3} />
                  <span>Blank Sheet</span>
                </div>
              ) : (
                <img
                  src={previewModalItem.thumbnailUrl}
                  alt="Enlarged preview"
                  style={{ transform: `rotate(${previewModalItem.rotation}deg)` }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Insert Slot Component between cards
const InsertSlot = ({ slotIndex, isOpen, onToggleOpen, onInsertBlank, onTriggerFileInput }) => {
  return (
    <div className={`pdf-organize-insert-slot ${isOpen ? 'is-open' : ''}`}>
      <button
        type="button"
        className="pdf-organize-insert-btn"
        title="Insert page here"
        onClick={onToggleOpen}
      >
        <Plus size={14} />
      </button>

      {isOpen && (
        <div className="pdf-organize-insert-dropdown">
          <button type="button" onClick={onInsertBlank}>
            <FileText size={14} />
            <span>Insert Blank Page</span>
          </button>
          <button type="button" onClick={onTriggerFileInput}>
            <FilePlus size={14} />
            <span>Insert from PDF...</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default PdfOrganizePage;

