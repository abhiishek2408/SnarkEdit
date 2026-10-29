import React, { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { Download, Layers2, Type, Shapes, Pencil, Move, FileText, Stamp, Upload, Trash2, Eraser, X, Plus, Pipette } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const PdfTextEditor = ({ value, onChange }) => {
  const [draft, setDraft] = useState(value ?? '');
  const editorRef = useRef(null);
  useEffect(() => {
    if (document.activeElement !== editorRef.current) setDraft(value ?? '');
  }, [value]);
  return <div ref={editorRef} role="textbox" aria-label="Edit added PDF text" aria-multiline="true" contentEditable suppressContentEditableWarning className="pdf-annotation-text-editor" onInput={event => onChange(event.currentTarget.innerText.replace(/\n$/, ''))} onBlur={event => setDraft(event.currentTarget.innerText.replace(/\n$/, ''))}>{draft}</div>;
};

const PagePreview = ({ pdfDocument, pageNumber, items, activeTool, onAddItem, onMoveItem, onRemoveItem, onEraseItem, onEditText, onTextAdded, onSelectText, color, brushSize, eraserSize, textSize, pageNumberSize, watermarkSize, fontFamily }) => {
  const [visible, setVisible] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const itemRef = useRef(null);
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const drawingRef = useRef(null);

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
    return { x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)), y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)) };
  };

  const annotationAtPoint = (point) => [...items].reverse().find((item) => {
    if (item.type !== 'draw') {
      const width = item.width || 0.2;
      const height = item.height || (item.type === 'text' ? 0.028 : 0.08);
      return point.x >= (item.x || 0) && point.x <= (item.x || 0) + width && point.y >= (item.y || 0) && point.y <= (item.y || 0) + height;
    }
    const points = item.points || [];
    const threshold = Math.max(0.018, eraserSize / 650, (item.brushSize || brushSize) / 1000);
    return points.some((current, index) => {
      if (index === 0) return Math.hypot(point.x - current.x, point.y - current.y) <= threshold;
      const previous = points[index - 1];
      const dx = current.x - previous.x;
      const dy = current.y - previous.y;
      const lengthSquared = dx * dx + dy * dy;
      const t = lengthSquared ? Math.max(0, Math.min(1, ((point.x - previous.x) * dx + (point.y - previous.y) * dy) / lengthSquared)) : 0;
      return Math.hypot(point.x - previous.x - t * dx, point.y - previous.y - t * dy) <= threshold;
    });
  });

  const startInteraction = (event) => {
    const point = pointFromEvent(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const target = event.target.closest('[data-item-id]');
    if (activeTool === 'drag' && target) {
      const annotation = items.find(item => item.id === target.dataset.itemId);
      if (annotation) {
        setSelectedItemId(annotation.id);
        const resize = event.target.closest('[data-resize]')?.dataset.resize || null;
        if (annotation.type !== 'draw') dragRef.current = { item: annotation, start: point, resize };
        if (annotation.type === 'text' && !resize) onSelectText(pageNumber, annotation);
        else if (annotation.type === 'shape') onSelectText(pageNumber, annotation);
        else if (annotation.type === 'draw') onSelectText(pageNumber, annotation);
        else if (annotation.type !== 'text') onSelectText(null, null);
      }
    } else if (activeTool === 'drag') {
      setSelectedItemId(null);
      onSelectText(null, null);
    } else if (activeTool === 'text' && target) {
      const annotation = items.find(item => item.id === target.dataset.itemId && item.type === 'text');
      if (annotation) {
        setSelectedItemId(annotation.id);
        onSelectText(pageNumber, annotation);
        const resize = event.target.closest('[data-resize]')?.dataset.resize || null;
        if (resize) dragRef.current = { item: annotation, start: point, resize };
      }
    } else if (activeTool === 'eraser') {
      const hit = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('[data-item-id]');
      const item = items.find(candidate => candidate.id === hit?.dataset.itemId) || annotationAtPoint(point) || items.find(candidate => candidate.id === target?.dataset.itemId);
      if (item?.type === 'draw') onEraseItem(pageNumber, item.id, point, eraserSize / 680);
      else if (item) onRemoveItem(pageNumber, item.id);
    } else if (activeTool === 'draw') {
      const newItem = { id: `${Date.now()}-${Math.random()}`, type: 'draw', points: [point], color, brushSize };
      drawingRef.current = newItem;
      onAddItem(pageNumber, newItem);
    }
  };

  const moveInteraction = (event) => {
    const point = pointFromEvent(event);
    if (!point) return;
    if (activeTool === 'eraser') {
      const hit = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('[data-item-id]');
      const item = items.find(candidate => candidate.id === hit?.dataset.itemId) || annotationAtPoint(point);
      if (item?.type === 'draw') onEraseItem(pageNumber, item.id, point, eraserSize / 680);
      else if (item) onRemoveItem(pageNumber, item.id);
    } else if (drawingRef.current) {
      const item = { ...drawingRef.current, points: [...drawingRef.current.points, point] };
      drawingRef.current = item;
      onMoveItem(pageNumber, item.id, { points: item.points });
    } else if (dragRef.current) {
      const { item, start, resize } = dragRef.current;
      const dx = point.x - start.x;
      const dy = point.y - start.y;
      let x = item.x || 0;
      let y = item.y || 0;
      let width = item.width || 0.2;
      let height = item.height || (item.type === 'text' ? 0.035 : 0.08);
      if (resize && (item.type === 'shape' || item.type === 'text')) {
        if (resize.includes('e')) width = Math.max(0.025, Math.min(1 - x, width + dx));
        if (resize.includes('s')) height = Math.max(0.025, Math.min(1 - y, height + dy));
        if (resize.includes('w')) { const right = x + width; x = Math.max(0, Math.min(right - 0.025, x + dx)); width = right - x; }
        if (resize.includes('n')) { const bottom = y + height; y = Math.max(0, Math.min(bottom - 0.025, y + dy)); height = bottom - y; }
        onMoveItem(pageNumber, item.id, { x, y, width, height });
        dragRef.current = { item: { ...item, x, y, width, height }, start: point, resize };
      } else {
        x = Math.max(0, Math.min(1 - width, x + dx));
        y = Math.max(0, Math.min(1 - height, y + dy));
        onMoveItem(pageNumber, item.id, { x, y });
        dragRef.current = { item: { ...item, x, y, width, height }, start: point, resize };
      }
    }
  };

  const endInteraction = () => { drawingRef.current = null; dragRef.current = null; };

  const addAtPoint = (event) => {
    if (activeTool === 'drag' || activeTool === 'draw' || activeTool === 'eraser' || activeTool === 'pageNumber' || activeTool === 'watermark' || !rendered) return;
    if (activeTool === 'text' && event.target.closest('[data-item-id]')?.classList.contains('text')) return;
    const point = pointFromEvent(event);
    if (point) {
      onAddItem(pageNumber, { id: `${Date.now()}-${Math.random()}`, type: activeTool, x: point.x, y: point.y, width: activeTool === 'shape' ? 0.22 : activeTool === 'text' ? 0.28 : undefined, height: activeTool === 'shape' ? 0.1 : activeTool === 'text' ? 0.028 : undefined, color, fontSize: activeTool === 'pageNumber' ? pageNumberSize : activeTool === 'watermark' ? watermarkSize : textSize, fontFamily });
      if (activeTool === 'text' || activeTool === 'shape') onTextAdded();
    }
  };

  const renderItem = (annotation, hiddenUnderlayCopy = false) => {
    if (annotation.type === 'draw') return <svg key={annotation.id} className={`pdf-annotation-drawing ${selectedItemId === annotation.id ? 'selected' : ''}`} viewBox="0 0 1000 1000" preserveAspectRatio="none" data-item-id={annotation.id}><polyline points={(annotation.points || []).map(point => `${point.x * 1000},${point.y * 1000}`).join(' ')} fill="none" stroke={annotation.color || '#2563eb'} strokeWidth={(annotation.brushSize || brushSize) * 2.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" /></svg>;
    const label = annotation.type === 'pageNumber' ? String(pageNumber) : annotation.type === 'watermark' ? (annotation.text || 'WATERMARK') : annotation.type === 'text' ? (annotation.text ?? 'Text') : '';
    return <div key={annotation.id + (hiddenUnderlayCopy ? '-underlay' : '-overlay')} data-item-id={annotation.id} className={`pdf-annotation-item ${annotation.type} ${annotation.shape || ''} ${selectedItemId === annotation.id ? 'selected' : ''}`} style={{ left: `${(annotation.x || 0) * 100}%`, top: `${(annotation.y || 0) * 100}%`, width: `${(annotation.width || 0.2) * 100}%`, height: `${(annotation.height || (annotation.type === 'text' ? 0.035 : 0.08)) * 100}%`, color: annotation.color || '#2563eb', backgroundColor: annotation.type === 'pageNumber' ? annotation.backgroundColor || 'transparent' : undefined, fontSize: annotation.type === 'text' || annotation.type === 'pageNumber' || annotation.type === 'watermark' ? `${annotation.fontSize || 16}px` : undefined, fontFamily: annotation.type === 'text' || annotation.type === 'watermark' ? (annotation.fontFamily === 'TimesRoman' ? 'Georgia, serif' : annotation.fontFamily === 'Courier' ? 'Courier New, monospace' : 'Arial, sans-serif') : undefined, fontWeight: annotation.type === 'watermark' ? (annotation.bold ? 800 : 400) : undefined, fontStyle: annotation.type === 'watermark' && annotation.italic ? 'italic' : undefined, textDecoration: annotation.type === 'watermark' && annotation.underline ? 'underline' : undefined, opacity: annotation.type === 'watermark' ? annotation.opacity ?? 1 : undefined, transform: annotation.type === 'watermark' && annotation.rotation ? 'rotate(' + annotation.rotation + 'deg)' : undefined }}>
      {annotation.type === 'text' ? <PdfTextEditor value={label} onChange={text => onEditText(pageNumber, annotation.id, text)} /> : label}
      {annotation.type === 'text' && selectedItemId === annotation.id && <button type="button" className="pdf-annotation-delete" title="Delete text" aria-label="Delete text" onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); onRemoveItem(pageNumber, annotation.id); setSelectedItemId(null); }}><X size={12} /></button>}
      {annotation.type === 'shape' && selectedItemId === annotation.id && <button type="button" className="pdf-annotation-delete" title="Delete shape" aria-label="Delete shape" onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); onRemoveItem(pageNumber, annotation.id); setSelectedItemId(null); }}><X size={12} /></button>}
      {(annotation.type === 'shape' || annotation.type === 'text') && selectedItemId === annotation.id && ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map(handle => <span key={handle} data-resize={handle} className={`pdf-shape-resize-handle handle-${handle}`} />)}
    </div>;
  };

  return (
    <article className="pdf-all-pages-item" ref={itemRef}>
      <div className="pdf-all-pages-heading"><strong>Page {pageNumber}</strong><span>{items.length} item{items.length === 1 ? '' : 's'} added</span></div>
      <div className="pdf-crop-canvas-wrap" ref={wrapRef}>
        <canvas ref={canvasRef} />
        <div className={`pdf-annotation-layer tool-${activeTool}`} style={{ pointerEvents: rendered ? 'auto' : 'none' }} onPointerDown={startInteraction} onPointerMove={moveInteraction} onPointerUp={endInteraction} onPointerCancel={endInteraction} onClick={addAtPoint}>
          {items.map(renderItem)}
        </div>
      </div>
      <div className="pdf-all-pages-actions">
        <span className="pdf-band-help">Choose a tool, then click the page. Select Drag to move items.</span>
      </div>
    </article>
  );
};

const EditPdfPage = ({ theme, toggleTheme }) => {
  const [file, setFile] = useState(null);
  const [pdfDocument, setPdfDocument] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [annotations, setAnnotations] = useState({});
  const [activeTool, setActiveTool] = useState('drag');
  const [annotationText, setAnnotationText] = useState('Your text');
  const [shape, setShape] = useState('rectangle');
  const [color, setColor] = useState('#2563eb');
  const [textColor, setTextColor] = useState('#111827');
  const [brushSize, setBrushSize] = useState(3);
  const [eraserSize, setEraserSize] = useState(12);
  const [textSize, setTextSize] = useState(16);
  const [pageNumberSize, setPageNumberSize] = useState(12);
  const [watermarkSize, setWatermarkSize] = useState(32);
  const [watermarkFontFamily, setWatermarkFontFamily] = useState('Helvetica');
  const [watermarkBold, setWatermarkBold] = useState(false);
  const [watermarkItalic, setWatermarkItalic] = useState(false);
  const [watermarkUnderline, setWatermarkUnderline] = useState(false);
  const [watermarkPosition, setWatermarkPosition] = useState('left');
  const [watermarkMosaic, setWatermarkMosaic] = useState(false);
  const [watermarkOpacity, setWatermarkOpacity] = useState(1);
  const [watermarkRotation, setWatermarkRotation] = useState(0);
  const [watermarkPageFrom, setWatermarkPageFrom] = useState(1);
  const [watermarkPageTo, setWatermarkPageTo] = useState(1);
  const [pageNumberBgColor, setPageNumberBgColor] = useState('#ffffff');
  const [pageNumberBgEnabled, setPageNumberBgEnabled] = useState(false);
  const [fontFamily, setFontFamily] = useState('Helvetica');
  const [selectedText, setSelectedText] = useState(null);
  const [selectedShape, setSelectedShape] = useState(null);
  const [selectedDrawing, setSelectedDrawing] = useState(null);
  const [brushOptionsOpen, setBrushOptionsOpen] = useState(false);

  useEffect(() => {
    if (!brushOptionsOpen) return;
    const closeOnOutsideClick = (event) => {
      if (event.target.closest?.('.pdf-annotation-item.text')) return;
      if (event.target.closest?.('.pdf-annotation-item.shape')) return;
      if (event.target.closest?.('.pdf-annotation-drawing')) return;
      if (activeTool === 'pageNumber' && event.target.closest?.('.pdf-crop-preview-panel')) return;
      if (activeTool === 'watermark' && event.target.closest?.('.pdf-crop-preview-panel')) return;
      if (!event.target.closest?.('.pdf-draw-modal, .pdf-text-properties-panel')) setBrushOptionsOpen(false);
    };
    const closeOnEscape = (event) => { if (event.key === 'Escape') setBrushOptionsOpen(false); };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [brushOptionsOpen, activeTool]);
  useEffect(() => {
    if (pageCount) setWatermarkPageTo(pageCount);
  }, [pageCount]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = async (files) => {
    const nextFile = files?.[0];
    if (!nextFile) return;
    setFile(null);
    setPdfDocument(null);
    setPageCount(0);
    setAnnotations({});
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
    } catch (err) {
      setError(err.message || 'Could not open this PDF. Try a valid, unprotected PDF.');
    }
  };

  const addAnnotation = (pageNumber, annotation) => {
    setAnnotations(current => ({ ...current, [pageNumber]: [...(current[pageNumber] || []), { ...annotation, text: annotation.type === 'text' ? annotationText : annotation.type === 'watermark' ? (annotationText || 'WATERMARK') : annotation.text, shape }] }));
    setResult(null);
  };

  const moveAnnotation = (pageNumber, id, changes) => {
    setAnnotations(current => ({ ...current, [pageNumber]: (current[pageNumber] || []).map(item => item.id === id ? { ...item, ...changes } : item) }));
    setResult(null);
  };

  const removeAnnotation = (pageNumber, id) => {
    setAnnotations(current => ({ ...current, [pageNumber]: (current[pageNumber] || []).filter(item => item.id !== id) }));
    setResult(null);
  };

  const eraseDrawSegment = (pageNumber, id, center, radius) => {
    setResult(null);
    setAnnotations(current => {
      const pageItems = current[pageNumber] || [];
      const target = pageItems.find(item => item.id === id);
      if (!target || target.type !== 'draw') return current;
      const source = target.points || [];
      const fragments = [];
      let fragment = [];
      const addPoint = (point) => {
        if (!fragment.length || Math.hypot(point.x - fragment[fragment.length - 1].x, point.y - fragment[fragment.length - 1].y) > 0.0005) fragment.push(point);
      };
      const flush = () => {
        if (fragment.length > 1) fragments.push(fragment);
        fragment = [];
      };
      const outside = (point) => Math.hypot(point.x - center.x, point.y - center.y) > radius;
      if (source.length === 1) {
        if (outside(source[0])) fragments.push(source);
      } else {
        for (let index = 1; index < source.length; index += 1) {
          const a = source[index - 1];
          const b = source[index];
          const distance = Math.hypot(b.x - a.x, b.y - a.y);
          const steps = Math.max(1, Math.ceil(distance / Math.max(radius / 3, 0.001)));
          for (let step = index === 1 ? 0 : 1; step <= steps; step += 1) {
            const t = step / steps;
            const point = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
            if (outside(point)) addPoint(point);
            else flush();
          }
        }
        flush();
      }
      const replacements = fragments.map((points, index) => ({ ...target, id: fragments.length === 1 ? id : `${id}-part-${Date.now()}-${index}`, points }));
      return { ...current, [pageNumber]: [...pageItems.filter(item => item.id !== id), ...replacements] };
    });
  };

  const editAnnotationText = (pageNumber, id, text) => {
    setAnnotations(current => ({ ...current, [pageNumber]: (current[pageNumber] || []).map(item => item.id === id ? { ...item, text } : item) }));
    setResult(null);
  };

  const updateSelectedText = (changes) => {
    if (!selectedText) return;
    setAnnotations(current => ({ ...current, [selectedText.pageNumber]: (current[selectedText.pageNumber] || []).map(item => item.id === selectedText.id ? { ...item, ...changes } : item) }));
    setResult(null);
  };
  const updateSelectedShape = (changes) => {
    if (!selectedShape) return;
    setAnnotations(current => ({ ...current, [selectedShape.pageNumber]: (current[selectedShape.pageNumber] || []).map(item => item.id === selectedShape.id ? { ...item, ...changes } : item) }));
    setResult(null);
  };
  const updateSelectedDrawing = (changes) => {
    if (!selectedDrawing) return;
    setAnnotations(current => ({ ...current, [selectedDrawing.pageNumber]: (current[selectedDrawing.pageNumber] || []).map(item => item.id === selectedDrawing.id ? { ...item, ...changes } : item) }));
    setResult(null);
  };

  const clearAnnotations = (pageNumber) => {
    setAnnotations(current => ({ ...current, [pageNumber]: [] }));
    setResult(null);
  };

  const createEditedPdf = async () => {
    if (!file || !pdfDocument) return;
    setIsProcessing(true);
    setError('');
    setResult(null);
    try {
      const output = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
      const fonts = {
        Helvetica: await output.embedFont(StandardFonts.Helvetica),
        HelveticaBold: await output.embedFont(StandardFonts.HelveticaBold),
        HelveticaOblique: await output.embedFont(StandardFonts.HelveticaOblique),
        HelveticaBoldOblique: await output.embedFont(StandardFonts.HelveticaBoldOblique),
        TimesRoman: await output.embedFont(StandardFonts.TimesRoman),
        TimesRomanBold: await output.embedFont(StandardFonts.TimesRomanBold),
        TimesRomanItalic: await output.embedFont(StandardFonts.TimesRomanItalic),
        TimesRomanBoldItalic: await output.embedFont(StandardFonts.TimesRomanBoldItalic),
        Courier: await output.embedFont(StandardFonts.Courier),
        CourierBold: await output.embedFont(StandardFonts.CourierBold),
        CourierOblique: await output.embedFont(StandardFonts.CourierOblique),
        CourierBoldOblique: await output.embedFont(StandardFonts.CourierBoldOblique),
      };
      const toColor = (hex = '#2563eb') => {
        const value = hex.replace('#', '');
        return rgb(parseInt(value.slice(0, 2), 16) / 255, parseInt(value.slice(2, 4), 16) / 255, parseInt(value.slice(4, 6), 16) / 255);
      };
      for (let index = 0; index < pageCount; index += 1) {
        const page = output.getPage(index);
        const { width, height } = page.getSize();
        const pageItems = annotations[index + 1] || [];
        for (const item of pageItems) {
          const x = (item.x || 0) * width;
          const yTop = (item.y || 0) * height;
          const ink = toColor(item.color);
          if (item.type === 'draw') {
            const points = item.points || [];
            for (let pointIndex = 1; pointIndex < points.length; pointIndex += 1) {
              const a = points[pointIndex - 1]; const b = points[pointIndex];
              page.drawLine({ start: { x: a.x * width, y: height - a.y * height }, end: { x: b.x * width, y: height - b.y * height }, thickness: item.brushSize || 3, color: ink });
            }
            continue;
          }
          if (item.type === 'shape') {
            const shapeWidth = (item.width || 0.22) * width;
            const shapeHeight = (item.height || 0.1) * height;
            if (item.shape === 'circle') page.drawEllipse({ x, y: height - yTop - shapeHeight, xScale: shapeWidth / 2, yScale: shapeHeight / 2, color: ink, borderColor: ink, borderWidth: 2 });
            else if (item.shape === 'line') page.drawLine({ start: { x, y: height - yTop }, end: { x: x + shapeWidth, y: height - yTop - shapeHeight }, thickness: 2, color: ink });
            else page.drawRectangle({ x, y: height - yTop - shapeHeight, width: shapeWidth, height: shapeHeight, color: ink, borderColor: ink, borderWidth: 2 });
            continue;
          }
          const text = item.type === 'pageNumber' ? String(index + 1) : item.type === 'watermark' ? (item.text || 'WATERMARK') : (item.text || 'Text');
          const size = (item.type === 'watermark' || item.type === 'text' || item.type === 'pageNumber') ? (item.fontSize || 16) : 16;
          const family = item.type === 'text' ? item.fontFamily : item.type === 'watermark' ? item.fontFamily || 'Helvetica' : 'Helvetica';
          const variant = item.bold && item.italic ? (family === 'TimesRoman' ? 'BoldItalic' : 'BoldOblique') : item.bold ? 'Bold' : item.italic ? (family === 'TimesRoman' ? 'Italic' : 'Oblique') : '';
          const font = fonts[`${family}${variant}`] || fonts[family] || fonts.Helvetica;
          const textWidth = font.widthOfTextAtSize(text, size);
          const textX = item.type === 'pageNumber' ? (width - textWidth) / 2 : item.type === 'watermark' ? x + (((item.width || 0.5) * width) - textWidth) / 2 : x;
          if (item.type === 'pageNumber' && item.backgroundColor) {
            const padding = Math.max(3, size * 0.2);
            page.drawRectangle({ x: textX - padding, y: Math.max(0, height - yTop - size) - padding / 2, width: textWidth + padding * 2, height: size + padding, color: toColor(item.backgroundColor) });
          }
          page.drawText(text, { x: textX, y: Math.max(0, height - yTop - size), size, font, color: ink, opacity: item.type === 'watermark' ? item.opacity ?? 0.3 : 1, rotate: item.type === 'watermark' ? degrees(item.rotation || 0) : undefined });
          if (item.type === 'watermark' && item.underline) {
            const baseline = Math.max(0, height - yTop - size);
            page.drawLine({ start: { x: textX, y: baseline - 2 }, end: { x: textX + font.widthOfTextAtSize(text, size), y: baseline - 2 }, thickness: Math.max(0.7, size / 18), color: ink, opacity: item.opacity ?? 0.3 });
          }
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
  const annotationCount = Object.values(annotations).reduce((total, items) => total + items.length, 0);
  const updatePageNumbers = (changes) => {
    setAnnotations(current => Object.fromEntries(Object.entries(current).map(([page, items]) => [page, items.map(item => item.type === 'pageNumber' ? { ...item, ...changes } : item)])));
    setResult(null);
  };
  const updateWatermarks = (changes) => {
    setAnnotations(current => Object.fromEntries(Object.entries(current).map(([page, items]) => [page, items.map(item => item.type === 'watermark' ? { ...item, ...changes } : item)])));
    setResult(null);
  };
  const layoutWatermarks = (position, mosaic, pageFrom = watermarkPageFrom, pageTo = watermarkPageTo) => {
    const anchors = {
      topLeft: [0, 0.05], top: [0.25, 0.05], topRight: [0.5, 0.05],
      left: [0, 0.45], center: [0.25, 0.45], right: [0.5, 0.45],
      bottomLeft: [0, 0.85], bottom: [0.25, 0.85], bottomRight: [0.5, 0.85],
    };
    const placements = mosaic
      ? [0.08, 0.38, 0.68].flatMap(x => [0.12, 0.43, 0.74].map(y => ({ x, y, width: 0.24, height: 0.1 })))
      : [{ x: anchors[position]?.[0] ?? 0.25, y: anchors[position]?.[1] ?? 0.45, width: 0.5, height: 0.1 }];
    setAnnotations(current => Object.fromEntries(Array.from({ length: pageCount }, (_, index) => {
      const page = index + 1;
      const items = current[page] || [];
      const existing = items.find(item => item.type === 'watermark');
      const base = existing || { text: annotationText || 'WATERMARK', color, fontSize: watermarkSize, fontFamily: watermarkFontFamily, bold: watermarkBold, italic: watermarkItalic, underline: watermarkUnderline, opacity: watermarkOpacity, rotation: watermarkRotation };
      const marks = placements.map((placement, markIndex) => ({ ...base, ...placement, id: markIndex === 0 && existing?.id ? existing.id : `watermark-${Date.now()}-${page}-${markIndex}`, type: 'watermark' }));
      const inRange = page >= pageFrom && page <= pageTo;
      return [page, [...items.filter(item => item.type !== 'watermark'), ...(inRange ? marks : [])]];
    })));
    setResult(null);
  };
  const selectPdfTool = (tool) => {
    setSelectedText(null);
    setSelectedShape(null);
    setSelectedDrawing(null);
    setActiveTool(tool);
    setBrushOptionsOpen(tool === 'draw' || tool === 'eraser' || tool === 'shape' || tool === 'pageNumber' || tool === 'watermark');
    if (tool === 'pageNumber' && pageCount) {
      setAnnotations(current => Object.fromEntries(Array.from({ length: pageCount }, (_, index) => {
        const pageNumber = index + 1;
        const items = current[pageNumber] || [];
        const existing = items.find(item => item.type === 'pageNumber');
        const numberItem = { ...(existing || {}), id: existing?.id || `page-number-${Date.now()}-${pageNumber}`, type: 'pageNumber', x: 0.46, y: 0.94, width: 0.08, height: 0.05, color, fontSize: pageNumberSize, backgroundColor: pageNumberBgEnabled ? pageNumberBgColor : null };
        return [pageNumber, [...items.filter(item => item.type !== 'pageNumber'), numberItem]];
      })));
      setResult(null);
    }
    if (tool === 'watermark' && pageCount) {
      layoutWatermarks(watermarkPosition, watermarkMosaic);
    }
  };
  const selectedTextItem = selectedText ? (annotations[selectedText.pageNumber] || []).find(item => item.id === selectedText.id) : null;
  const editingExistingText = Boolean(selectedTextItem);
  const showPageNumberSettings = activeTool === 'pageNumber' && brushOptionsOpen;
  const showWatermarkSettings = activeTool === 'watermark' && brushOptionsOpen;
  const selectedShapeItem = selectedShape ? (annotations[selectedShape.pageNumber] || []).find(item => item.id === selectedShape.id) : null;
  const selectedDrawingItem = selectedDrawing ? (annotations[selectedDrawing.pageNumber] || []).find(item => item.id === selectedDrawing.id) : null;
  const showShapeSettings = brushOptionsOpen && (activeTool === 'shape' || Boolean(selectedShapeItem));
  const showDrawingSettings = brushOptionsOpen && Boolean(selectedDrawingItem);
  const showSideProperties = brushOptionsOpen && (editingExistingText || showPageNumberSettings || showWatermarkSettings || showShapeSettings || showDrawingSettings);
  const currentTextSize = editingExistingText ? selectedTextItem.fontSize || 16 : textSize;
  const currentTextColor = editingExistingText ? selectedTextItem.color || '#111827' : textColor;
  const currentFontFamily = editingExistingText ? selectedTextItem.fontFamily || 'Helvetica' : fontFamily;

  return (
    <div className="app-container reducer-page pdf-tool-page pdf-edit-page">
      <Navbar onHome={() => {}} theme={theme} toggleTheme={toggleTheme} hideEditorControls={true} />
      <main className="reducer-shell">
        <section className={`reducer-workspace ${(editingExistingText || showPageNumberSettings || showWatermarkSettings || showShapeSettings || showDrawingSettings) && brushOptionsOpen ? 'has-side-properties' : ''}`}>
          <div className="reducer-heading"><div><p>PDF Editor</p><h1>Edit your PDF pages</h1></div><Layers2 size={34} /></div>
          <p className="pdf-stacker-intro">Add page numbers, shapes, drawings, text, and watermarks, then drag items into place.</p>
          <div className={`reducer-grid merger-grid pdf-stacker-grid ${file ? 'has-file' : 'no-file'} ${showSideProperties ? 'has-side-properties' : ''}`}>
            <section className="reducer-panel">
              <label className="reducer-upload"><Upload size={24} /><strong>{file ? file.name : 'Choose a PDF'}</strong><span>{file ? `${pageCount} pages loaded` : 'Select a PDF to edit'}</span><input type="file" accept="application/pdf,.pdf" onChange={(event) => handleFile(event.target.files)} /></label>
              {file && <>
                <div className="pdf-editor-tool-list">
                  {[
                    ['drag', Move, 'Drag'], ['pageNumber', FileText, 'Add page number'], ['shape', Shapes, 'Add shape'],
                    ['draw', Pencil, 'Draw'], ['text', Type, 'Add text'], ['eraser', Eraser, 'Eraser'], ['watermark', Stamp, 'Add watermark'],
                  ].map(([tool, Icon, label]) => <button key={tool} type="button" className={activeTool === tool ? 'active' : ''} onClick={() => selectPdfTool(tool)}><Icon size={16} />{label}</button>)}
                </div>
                <div className="pdf-crop-count">{annotationCount} item{annotationCount === 1 ? '' : 's'} added · Active tool: {activeTool === 'pageNumber' ? 'Page number' : activeTool === 'watermark' ? 'Watermark' : activeTool === 'shape' ? 'Shape' : activeTool === 'text' ? 'Text' : activeTool === 'draw' ? 'Draw' : activeTool === 'eraser' ? 'Eraser' : 'Drag'}</div>
                <button className="btn-primary reducer-action" type="button" onClick={createEditedPdf} disabled={isProcessing || !annotationCount}><Layers2 size={18} /><span>{isProcessing ? 'Applying edits...' : 'Create edited PDF'}</span></button>
                {result && <button className="btn-primary reducer-action" type="button" onClick={download}><Download size={18} /><span>Download edited PDF</span></button>}
              </>}
              {error && <p className="reducer-error">{error}</p>}
            </section>
            {pdfDocument && <section className="reducer-panel pdf-crop-preview-panel">
              {pdfDocument ? <div className="pdf-all-pages-list">
                {pageOptions.map(pageNumber => <div className="pdf-editor-page-preview" key={pageNumber}>
                  <PagePreview pdfDocument={pdfDocument} pageNumber={pageNumber} items={annotations[pageNumber] || []} activeTool={activeTool} onAddItem={addAnnotation} onMoveItem={moveAnnotation} onRemoveItem={removeAnnotation} onEraseItem={eraseDrawSegment} onEditText={editAnnotationText} onTextAdded={() => { setActiveTool('drag'); setSelectedShape(null); setSelectedDrawing(null); setBrushOptionsOpen(false); }} onSelectText={(selectedPage, item) => { if (selectedPage && item?.type === 'text') { setSelectedShape(null); setSelectedDrawing(null); setSelectedText({ pageNumber: selectedPage, id: item.id }); setBrushOptionsOpen(true); } else if (selectedPage && item?.type === 'shape') { setSelectedText(null); setSelectedDrawing(null); setSelectedShape({ pageNumber: selectedPage, id: item.id }); setShape(item.shape || 'rectangle'); setColor(item.color || '#2563eb'); setBrushOptionsOpen(true); } else if (selectedPage && item?.type === 'draw') { setSelectedText(null); setSelectedShape(null); setSelectedDrawing({ pageNumber: selectedPage, id: item.id }); setBrushSize(item.brushSize || 3); setColor(item.color || '#2563eb'); setBrushOptionsOpen(true); } else { setSelectedText(null); setSelectedShape(null); setSelectedDrawing(null); setBrushOptionsOpen(false); } }} color={activeTool === 'text' ? textColor : color} brushSize={brushSize} eraserSize={eraserSize} textSize={textSize} pageNumberSize={pageNumberSize} watermarkSize={watermarkSize} fontFamily={fontFamily} />
                  {(annotations[pageNumber] || []).length > 0 && <button className="pdf-clear-crop" type="button" onClick={() => clearAnnotations(pageNumber)}><Trash2 size={15} /> Clear page items</button>}
                </div>)}
              </div> : null}
            </section>}
            {editingExistingText && brushOptionsOpen && <aside className="pdf-text-properties-panel">
              <header><div><span>PDF Editor</span><h2>Text settings</h2></div><button type="button" aria-label="Close text settings" onClick={() => setBrushOptionsOpen(false)}><X size={18} /></button></header>
              <label><span>Text size <strong>{currentTextSize}px</strong></span><input type="range" min="10" max="96" value={currentTextSize} onChange={event => updateSelectedText({ fontSize: Number(event.target.value) })} /></label>
              <label><span>Font</span><select className="pdf-shape-modal-select" value={currentFontFamily} onChange={event => updateSelectedText({ fontFamily: event.target.value })}><option value="Helvetica">Helvetica</option><option value="TimesRoman">Times New Roman</option><option value="Courier">Courier</option></select></label>
              <div className="pdf-draw-color-picker">
                <span>Text color</span>
                <div className="pdf-draw-color-tools">
                  <label className="pdf-draw-color-wheel" aria-label="Choose text color"><span><Plus size={22} /></span><input type="color" value={currentTextColor} onChange={event => updateSelectedText({ color: event.target.value })} /></label>
                  <button className="pdf-draw-eyedropper" type="button" title="Pick color from screen" aria-label="Pick color from screen" onClick={async () => { if (!window.EyeDropper) return; try { const picked = await new window.EyeDropper().open(); updateSelectedText({ color: picked.sRGBHex }); } catch {} }}><Pipette size={20} /></button>
                  <label className="pdf-draw-selected-color" style={{ '--brush-color': currentTextColor }} title={`Selected color ${currentTextColor}`}><input type="color" aria-label="Selected text color" value={currentTextColor} onChange={event => updateSelectedText({ color: event.target.value })} /></label>
                </div>
              </div>
              <div className="pdf-draw-font-preview" style={{ color: currentTextColor, fontFamily: currentFontFamily === 'TimesRoman' ? 'Georgia, serif' : currentFontFamily === 'Courier' ? 'Courier New, monospace' : 'Arial, sans-serif', fontSize: `${currentTextSize}px` }}>Sample text</div>
            </aside>}
            {showWatermarkSettings && <aside className="pdf-text-properties-panel">
              <header><div><span>PDF Editor</span><h2>Watermark settings</h2></div><button type="button" aria-label="Close watermark settings" onClick={() => setBrushOptionsOpen(false)}><X size={18} /></button></header>
              <label><span>Watermark text</span><input value={annotationText} onChange={event => { setAnnotationText(event.target.value); updateWatermarks({ text: event.target.value || 'WATERMARK' }); }} /></label>
              <label><span>Font</span><select className="pdf-shape-modal-select" value={watermarkFontFamily} onChange={event => { setWatermarkFontFamily(event.target.value); updateWatermarks({ fontFamily: event.target.value }); }}><option value="Helvetica">Arial</option><option value="TimesRoman">Times New Roman</option><option value="Courier">Courier</option></select></label>
              <div className="pdf-watermark-placement">
                <span>Position</span>
                <div className="pdf-watermark-position-grid" role="group" aria-label="Watermark position">
                  {[['topLeft', 'Top left'], ['top', 'Top'], ['topRight', 'Top right'], ['left', 'Left'], ['center', 'Center'], ['right', 'Right'], ['bottomLeft', 'Bottom left'], ['bottom', 'Bottom'], ['bottomRight', 'Bottom right']].map(([position, label]) => <button key={position} type="button" className={watermarkPosition === position && !watermarkMosaic ? 'active' : ''} aria-label={label} aria-pressed={watermarkPosition === position && !watermarkMosaic} onClick={() => { setWatermarkPosition(position); setWatermarkMosaic(false); layoutWatermarks(position, false); }}><span /></button>)}
                </div>
                <label className="pdf-watermark-mosaic"><input type="checkbox" checked={watermarkMosaic} onChange={event => { const mosaic = event.target.checked; setWatermarkMosaic(mosaic); layoutWatermarks(watermarkPosition, mosaic); }} /><span>Mosaic</span></label>
              </div>
              <div className="pdf-watermark-option-row">
                <label><span>Rotation</span><select className="pdf-shape-modal-select" value={watermarkRotation} onChange={event => { const rotation = Number(event.target.value); setWatermarkRotation(rotation); updateWatermarks({ rotation }); }}><option value="0">Do not rotate</option><option value="-45">-45°</option><option value="45">45°</option><option value="90">90°</option></select></label>
              </div>
              <div className="pdf-watermark-pages">
                <span>Pages</span>
                <label>From page<input type="number" min="1" max={pageCount} value={watermarkPageFrom} onChange={event => { const pageFrom = Math.min(pageCount, Math.min(Number(event.target.value) || 1, watermarkPageTo)); setWatermarkPageFrom(pageFrom); layoutWatermarks(watermarkPosition, watermarkMosaic, pageFrom, watermarkPageTo); }} /></label>
                <label>To<input type="number" min={watermarkPageFrom} max={pageCount} value={watermarkPageTo} onChange={event => { const pageTo = Math.min(pageCount, Math.max(Number(event.target.value) || 1, watermarkPageFrom)); setWatermarkPageTo(pageTo); layoutWatermarks(watermarkPosition, watermarkMosaic, watermarkPageFrom, pageTo); }} /></label>
              </div>
              <label className="pdf-watermark-opacity"><span>Opacity <strong>{Math.round(watermarkOpacity * 100)}%</strong></span><input type="range" min="0" max="100" value={Math.round(watermarkOpacity * 100)} onChange={event => { const opacity = Number(event.target.value) / 100; setWatermarkOpacity(opacity); updateWatermarks({ opacity }); }} /></label>
              <div className="pdf-watermark-format-tools" aria-label="Watermark text format">
                <button type="button" className={watermarkBold ? 'active' : ''} aria-label="Bold" aria-pressed={watermarkBold} onClick={() => { const bold = !watermarkBold; setWatermarkBold(bold); updateWatermarks({ bold }); }}><strong>B</strong></button>
                <button type="button" className={watermarkItalic ? 'active' : ''} aria-label="Italic" aria-pressed={watermarkItalic} onClick={() => { const italic = !watermarkItalic; setWatermarkItalic(italic); updateWatermarks({ italic }); }}><em>I</em></button>
                <button type="button" className={watermarkUnderline ? 'active' : ''} aria-label="Underline" aria-pressed={watermarkUnderline} onClick={() => { const underline = !watermarkUnderline; setWatermarkUnderline(underline); updateWatermarks({ underline }); }}><u>U</u></button>
              </div>
              <label><span>Text size <strong>{watermarkSize}px</strong></span><input type="range" min="12" max="96" value={watermarkSize} onChange={event => { const fontSize = Number(event.target.value); setWatermarkSize(fontSize); updateWatermarks({ fontSize }); }} /></label>
              <div className="pdf-draw-color-picker">
                <span>Text color</span>
                <div className="pdf-draw-color-tools">
                  <label className="pdf-draw-color-wheel" aria-label="Choose watermark color"><span><Plus size={22} /></span><input type="color" value={color} onChange={event => { setColor(event.target.value); updateWatermarks({ color: event.target.value }); }} /></label>
                  <button className="pdf-draw-eyedropper" type="button" title="Pick watermark color from screen" aria-label="Pick watermark color from screen" onClick={async () => { if (!window.EyeDropper) return; try { const picked = await new window.EyeDropper().open(); setColor(picked.sRGBHex); updateWatermarks({ color: picked.sRGBHex }); } catch {} }}><Pipette size={20} /></button>
                  <label className="pdf-draw-selected-color" style={{ '--brush-color': color }} title={`Selected watermark color ${color}`}><input type="color" aria-label="Selected watermark color" value={color} onChange={event => { setColor(event.target.value); updateWatermarks({ color: event.target.value }); }} /></label>
                </div>
              </div>
              <div className="pdf-draw-font-preview" style={{ color, fontSize: `${watermarkSize}px` }}>{annotationText || 'WATERMARK'}</div>
            </aside>}
            {showShapeSettings && <aside className="pdf-text-properties-panel">
              <header><div><span>PDF Editor</span><h2>Shape settings</h2></div><button type="button" aria-label="Close shape settings" onClick={() => setBrushOptionsOpen(false)}><X size={18} /></button></header>
              <label><span>Shape type</span><select className="pdf-shape-modal-select" value={selectedShapeItem?.shape || shape} onChange={event => { const nextShape = event.target.value; setShape(nextShape); updateSelectedShape({ shape: nextShape }); }}><option value="rectangle">Rectangle</option><option value="circle">Circle</option><option value="line">Line</option></select></label>
              <div className="pdf-draw-color-picker">
                <span>Shape color</span>
                <div className="pdf-draw-color-tools">
                  <label className="pdf-draw-color-wheel" aria-label="Choose shape color"><span><Plus size={22} /></span><input type="color" value={selectedShapeItem?.color || color} onChange={event => { setColor(event.target.value); updateSelectedShape({ color: event.target.value }); }} /></label>
                  <button className="pdf-draw-eyedropper" type="button" title="Pick shape color from screen" aria-label="Pick shape color from screen" onClick={async () => { if (!window.EyeDropper) return; try { const picked = await new window.EyeDropper().open(); setColor(picked.sRGBHex); updateSelectedShape({ color: picked.sRGBHex }); } catch {} }}><Pipette size={20} /></button>
                  <label className="pdf-draw-selected-color" style={{ '--brush-color': selectedShapeItem?.color || color }} title={`Selected shape color ${selectedShapeItem?.color || color}`}><input type="color" aria-label="Selected shape color" value={selectedShapeItem?.color || color} onChange={event => { setColor(event.target.value); updateSelectedShape({ color: event.target.value }); }} /></label>
                </div>
              </div>
              <div className="pdf-shape-settings-preview"><div className={`pdf-shape-settings-preview-shape ${selectedShapeItem?.shape || shape}`} style={{ '--shape-color': selectedShapeItem?.color || color }} /></div>
            </aside>}
            {showDrawingSettings && selectedDrawingItem && <aside className="pdf-text-properties-panel">
              <header><div><span>PDF Editor</span><h2>Drawing settings</h2></div><button type="button" aria-label="Close drawing settings" onClick={() => setBrushOptionsOpen(false)}><X size={18} /></button></header>
              <label><span>Brush size <strong>{selectedDrawingItem.brushSize || 3}px</strong></span><input type="range" min="1" max="40" value={selectedDrawingItem.brushSize || 3} onChange={event => { const size = Number(event.target.value); setBrushSize(size); updateSelectedDrawing({ brushSize: size }); }} /></label>
              <div className="pdf-draw-color-picker">
                <span>Brush color</span>
                <div className="pdf-draw-color-tools">
                  <label className="pdf-draw-color-wheel" aria-label="Choose drawing color"><span><Plus size={22} /></span><input type="color" value={selectedDrawingItem.color || color} onChange={event => { setColor(event.target.value); updateSelectedDrawing({ color: event.target.value }); }} /></label>
                  <button className="pdf-draw-eyedropper" type="button" title="Pick drawing color from screen" aria-label="Pick drawing color from screen" onClick={async () => { if (!window.EyeDropper) return; try { const picked = await new window.EyeDropper().open(); setColor(picked.sRGBHex); updateSelectedDrawing({ color: picked.sRGBHex }); } catch {} }}><Pipette size={20} /></button>
                  <label className="pdf-draw-selected-color" style={{ '--brush-color': selectedDrawingItem.color || color }} title={`Selected drawing color ${selectedDrawingItem.color || color}`}><input type="color" aria-label="Selected drawing color" value={selectedDrawingItem.color || color} onChange={event => { setColor(event.target.value); updateSelectedDrawing({ color: event.target.value }); }} /></label>
                </div>
              </div>
            </aside>}
            {showPageNumberSettings && <aside className="pdf-text-properties-panel">
              <header><div><span>PDF Editor</span><h2>Page number settings</h2></div><button type="button" aria-label="Close page number settings" onClick={() => setBrushOptionsOpen(false)}><X size={18} /></button></header>
              <label><span>Number size <strong>{pageNumberSize}px</strong></span><input type="range" min="8" max="48" value={pageNumberSize} onChange={event => { const fontSize = Number(event.target.value); setPageNumberSize(fontSize); updatePageNumbers({ fontSize }); }} /></label>
              <label className="pdf-page-number-bg-toggle"><span>Background</span><input type="checkbox" checked={pageNumberBgEnabled} onChange={event => { const enabled = event.target.checked; setPageNumberBgEnabled(enabled); updatePageNumbers({ backgroundColor: enabled ? pageNumberBgColor : null }); }} /></label>
              {pageNumberBgEnabled && <div className="pdf-draw-color-picker">
                <span>Background color</span>
                <div className="pdf-draw-color-tools">
                  <label className="pdf-draw-color-wheel" aria-label="Choose background color"><span><Plus size={22} /></span><input type="color" value={pageNumberBgColor} onChange={event => { setPageNumberBgColor(event.target.value); updatePageNumbers({ backgroundColor: event.target.value }); }} /></label>
                  <button className="pdf-draw-eyedropper" type="button" title="Pick background color from screen" aria-label="Pick background color from screen" onClick={async () => { if (!window.EyeDropper) return; try { const picked = await new window.EyeDropper().open(); setPageNumberBgColor(picked.sRGBHex); updatePageNumbers({ backgroundColor: picked.sRGBHex }); } catch {} }}><Pipette size={20} /></button>
                  <label className="pdf-draw-selected-color" style={{ '--brush-color': pageNumberBgColor }} title={`Selected background ${pageNumberBgColor}`}><input type="color" aria-label="Selected background color" value={pageNumberBgColor} onChange={event => { setPageNumberBgColor(event.target.value); updatePageNumbers({ backgroundColor: event.target.value }); }} /></label>
                </div>
              </div>}
              <div className="pdf-draw-color-picker">
                <span>Number color</span>
                <div className="pdf-draw-color-tools">
                  <label className="pdf-draw-color-wheel" aria-label="Choose page number color"><span><Plus size={22} /></span><input type="color" value={color} onChange={event => { setColor(event.target.value); updatePageNumbers({ color: event.target.value }); }} /></label>
                  <button className="pdf-draw-eyedropper" type="button" title="Pick color from screen" aria-label="Pick color from screen" onClick={async () => { if (!window.EyeDropper) return; try { const picked = await new window.EyeDropper().open(); setColor(picked.sRGBHex); updatePageNumbers({ color: picked.sRGBHex }); } catch {} }}><Pipette size={20} /></button>
                  <label className="pdf-draw-selected-color" style={{ '--brush-color': color }} title={`Selected color ${color}`}><input type="color" aria-label="Selected number color" value={color} onChange={event => { setColor(event.target.value); updatePageNumbers({ color: event.target.value }); }} /></label>
                </div>
              </div>
              <div className="pdf-draw-font-preview" style={{ color, fontSize: `${pageNumberSize}px` }}>1</div>
            </aside>}
            {pdfDocument && !showSideProperties && <aside className="pdf-text-properties-panel pdf-text-properties-reserved" aria-hidden="true" />}
          </div>
        </section>
      </main>
      {brushOptionsOpen && (activeTool === 'draw' || activeTool === 'eraser') && <div className="pdf-draw-modal-backdrop" onPointerDown={event => { if (event.target === event.currentTarget) setBrushOptionsOpen(false); }}>
        <section className="pdf-draw-modal" role="dialog" aria-modal={editingExistingText ? 'false' : 'true'} aria-labelledby="pdf-draw-modal-title">
          <header><div><span>PDF Editor</span><h2 id="pdf-draw-modal-title">{activeTool === 'eraser' ? 'Eraser settings' : activeTool === 'shape' ? 'Shape settings' : activeTool === 'text' || editingExistingText ? 'Text settings' : 'Draw settings'}</h2></div><button type="button" aria-label="Close settings" onClick={() => setBrushOptionsOpen(false)}><X size={18} /></button></header>
          {(activeTool === 'draw' || activeTool === 'eraser') && <label><span>{activeTool === 'eraser' ? 'Eraser size' : 'Brush size'} <strong>{activeTool === 'eraser' ? eraserSize : brushSize}px</strong></span><input type="range" min="1" max="40" value={activeTool === 'eraser' ? eraserSize : brushSize} onChange={event => activeTool === 'eraser' ? setEraserSize(Number(event.target.value)) : setBrushSize(Number(event.target.value))} /></label>}
          {activeTool === 'shape' && <label><span>Shape type</span><select className="pdf-shape-modal-select" value={shape} onChange={event => setShape(event.target.value)}><option value="rectangle">Rectangle</option><option value="circle">Circle</option><option value="line">Line</option></select></label>}
          {editingExistingText && <>
            <label><span>Text size <strong>{currentTextSize}px</strong></span><input type="range" min="10" max="96" value={currentTextSize} onChange={event => editingExistingText ? updateSelectedText({ fontSize: Number(event.target.value) }) : setTextSize(Number(event.target.value))} /></label>
            <label><span>Font</span><select className="pdf-shape-modal-select" value={currentFontFamily} onChange={event => editingExistingText ? updateSelectedText({ fontFamily: event.target.value }) : setFontFamily(event.target.value)}><option value="Helvetica">Helvetica</option><option value="TimesRoman">Times New Roman</option><option value="Courier">Courier</option></select></label>
          </>}
          {(activeTool === 'draw' || activeTool === 'shape' || editingExistingText) && <div className="pdf-draw-color-picker">
            <span>{editingExistingText ? 'Text color' : activeTool === 'shape' ? 'Shape color' : 'Brush color'}</span>
            <div className="pdf-draw-color-tools">
              <label className="pdf-draw-color-wheel" aria-label="Choose color"><span><Plus size={22} /></span><input type="color" value={editingExistingText ? currentTextColor : activeTool === 'text' ? textColor : color} onChange={event => editingExistingText ? updateSelectedText({ color: event.target.value }) : activeTool === 'text' ? setTextColor(event.target.value) : setColor(event.target.value)} /></label>
              <button className="pdf-draw-eyedropper" type="button" title="Pick color from screen" aria-label="Pick color from screen" onClick={async () => { if (!window.EyeDropper) return; try { const picked = await new window.EyeDropper().open(); editingExistingText ? updateSelectedText({ color: picked.sRGBHex }) : activeTool === 'text' ? setTextColor(picked.sRGBHex) : setColor(picked.sRGBHex); } catch {} }}><Pipette size={20} /></button>
              <label className="pdf-draw-selected-color" style={{ '--brush-color': editingExistingText ? currentTextColor : activeTool === 'text' ? textColor : color }} title={`Selected color ${editingExistingText ? currentTextColor : activeTool === 'text' ? textColor : color}`}><input type="color" aria-label="Selected color" value={editingExistingText ? currentTextColor : activeTool === 'text' ? textColor : color} onChange={event => editingExistingText ? updateSelectedText({ color: event.target.value }) : activeTool === 'text' ? setTextColor(event.target.value) : setColor(event.target.value)} /></label>
            </div>
          </div>}
          {editingExistingText && <div className="pdf-draw-font-preview" style={{ color: currentTextColor, fontFamily: currentFontFamily === 'TimesRoman' ? 'Georgia, serif' : currentFontFamily === 'Courier' ? 'Courier New, monospace' : 'Arial, sans-serif', fontSize: `${currentTextSize}px` }}>Sample text</div>}
        </section>
      </div>}
      <Footer />
    </div>
  );
};

export default EditPdfPage;
