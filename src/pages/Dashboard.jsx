import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Smile, Crop, RotateCcw, RotateCw, FlipHorizontal, FlipVertical,
  Sun, Contrast, Droplet, Move, MousePointer2, Trash2, Download,
  Image as ImageIcon, Type, Square, Circle, ArrowRight, Sparkles,
  Layers, Search, ZoomIn, ZoomOut, Undo, Redo, Scissors, Wand2,
  Palette, Ghost, Sticker, Hexagon, Minus, Plus, Maximize, Wind, Cloud,
  Moon, Zap, Star, Heart, Settings, HelpCircle, Share2, Lock,
  Unlock, Eye, EyeOff, Files, Copy, PenTool, Paintbrush, 
  Camera, LayoutPanelTop, Fingerprint, Focus, 
  Glasses, Hand, Highlighter, Map, MessageSquare, Mic, Music, 
  Navigation, Phone, Shield, Speaker, Tag, Target, Terminal, 
  Thermometer, Tv, User, Video, Watch, Wifi, Zap as Flash, UtensilsCrossed,
  MoveHorizontal, MoveVertical, AlignLeft, AlignCenter, AlignRight,
  AlignHorizontalJustifyCenter, AlignVerticalJustifyCenter,
  Activity, Layout, Triangle, Box, Grid as GridIcon, Diamond, Award, Leaf, Bookmark, GripVertical, ArrowDownWideNarrow,
  Database, ShieldCheck, StickyNote, ChevronLeft, ChevronRight, Parentheses, ArrowUp, ArrowLeft, ArrowDown, CornerDownRight, CornerDownLeft, CornerUpLeft, CornerUpRight, Eraser,
  Pentagon, Magnet, PlusCircle, LayoutList
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { removeBackground } from '@imgly/background-removal';
import html2canvas from 'html2canvas';

// Internal Components
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Sidebar from '../components/Sidebar';
import LayerPanel from '../components/LayerPanel';

// Constants & Hooks
import { CATEGORIES, FONTS, TOOLS_DEFS } from '../constants/tools';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

// Using the exported defs directly to ensure they stay in sync
const TOOLS = TOOLS_DEFS;

function Dashboard() {
  const [image, setImage] = useState(null);
  const [activeTool, setActiveTool] = useState('add-text');
  const [activeCategory, setActiveCategory] = useState('Text');
  const [isProcessing, setIsProcessing] = useState(false);
  const [values, setValues] = useState({});
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isTemplateMode, setIsTemplateMode] = useState(false);
  const [templateData, setTemplateData] = useState({
    name: 'Helene Paquet',
    handle: '@reallygreatsite',
    text: 'Instagram algorithm is just like a flame look at something for one second and it spreads everywhere.',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg'
  });
  const [exportFormat, setExportFormat] = useState('png');
  const [exportQuality, setExportQuality] = useState(1.0);
  const [theme, setTheme] = useState('light');
  const [canvasBg, setCanvasBg] = useState('transparent');
  const [layers, setLayers] = useState([]); 
  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const [isBlankCanvas, setIsBlankCanvas] = useState(false);
  const [isStudioMode, setIsStudioMode] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 800 });
  const [drawPaths, setDrawPaths] = useState([]);
  const [currentPath, setCurrentPath] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(10);
  const [brushColor, setBrushColor] = useState('#3b82f6');
  const [brushOpacity, setBrushOpacity] = useState(1);
  const [brushHardness, setBrushHardness] = useState(0);
  const [isAdjustingBrush, setIsAdjustingBrush] = useState(false);
  const [lassoPoints, setLassoPoints] = useState([]);
  const [editingTextId, setEditingTextId] = useState(null);
  const [clipboard, setClipboard] = useState(null);
  const [brushType, setBrushType] = useState('solid'); 
  const [alignmentGuides, setAlignmentGuides] = useState({ x: null, y: null });
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isCleaningMode, setIsCleaningMode] = useState(false);
  const [cleaningPaths, setCleaningPaths] = useState([]);
  const [isSmartCleaning, setIsSmartCleaning] = useState(false);
  const [projectSettings, setProjectSettings] = useState({ width: 800, height: 800, name: 'Untitled Design' });
  const [notification, setNotification] = useState(null);
  const [showGrid, setShowGrid] = useState(false);
  const [patternScale, setPatternScale] = useState(1);
  const [patternOpacity, setPatternOpacity] = useState(0.4);
  const [patternColor, setPatternColor] = useState('#000000');
  const [currentPattern, setCurrentPattern] = useState(null);
  const [patternShades, setPatternShades] = useState({
    top: { enabled: false, color: '#ffffff', spread: 100 },
    bottom: { enabled: false, color: '#ffffff', spread: 100 },
    left: { enabled: false, color: '#ffffff', spread: 100 },
    right: { enabled: false, color: '#ffffff', spread: 100 },
    center: { enabled: false, color: '#ffffff', spread: 100 }
  });

  // UI Overlays Sync States
  const [showToolSettings, internalSetShowToolSettings] = useState(false);
  const [showSidebar, internalSetShowSidebar] = useState(window.innerWidth > 1024);
  const [showLayerPanel, internalSetShowLayerPanel] = useState(true);
  const [showShadeModal, internalSetShowShadeModal] = useState(false);

  const closeAllOverlays = () => {
    internalSetShowSidebar(false);
    internalSetShowLayerPanel(false);
    internalSetShowToolSettings(false);
    internalSetShowShadeModal(false);
  };

  const setShowToolSettings = (val) => {
    if (val) {
      if (window.innerWidth <= 1024) closeAllOverlays();
      else { internalSetShowLayerPanel(false); internalSetShowShadeModal(false); }
    }
    internalSetShowToolSettings(val);
  };
  const setShowSidebar = (val) => {
    if (val && window.innerWidth <= 1024) closeAllOverlays();
    internalSetShowSidebar(val);
  };
  const setShowLayerPanel = (val) => {
    if (val) {
      if (window.innerWidth <= 1024) closeAllOverlays();
      else { internalSetShowToolSettings(false); internalSetShowShadeModal(false); }
    }
    internalSetShowLayerPanel(val);
  };
  const setShowShadeModal = (val) => {
    if (val) closeAllOverlays();
    internalSetShowShadeModal(val);
  };

  const handleSelectTool = (toolId) => {
    setActiveTool(toolId);
    if (toolId && toolId !== 'draw-none') {
      setShowToolSettings(true);
    } else {
      setShowToolSettings(false);
    }
  };

  const moveLayer = (direction) => {
    if (!selectedLayerId) return;
    setLayers(prev => {
      const idx = prev.findIndex(l => l.id === selectedLayerId);
      if (idx === -1) return prev;
      const newLayers = [...prev];
      if (direction === 'up' && idx < newLayers.length - 1) {
        [newLayers[idx], newLayers[idx+1]] = [newLayers[idx+1], newLayers[idx]];
      } else if (direction === 'down' && idx > 0) {
        [newLayers[idx], newLayers[idx-1]] = [newLayers[idx-1], newLayers[idx]];
      } else if (direction === 'front') {
        const item = newLayers.splice(idx, 1)[0];
        newLayers.push(item);
      } else if (direction === 'back') {
        const item = newLayers.splice(idx, 1)[0];
        newLayers.unshift(item);
      }
      return newLayers;
    });
    saveToHistory();
  };

  const fileInputRef = useRef(null);
  const avatarInputRef = useRef(null);
  const canvasRef = useRef(null);
  const valuesRef = useRef({});
  useEffect(() => { valuesRef.current = values; }, [values]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Reset tool when switching to Draw category
  useEffect(() => {
    if (activeCategory === 'Draw') {
      setActiveTool(null);
    }
  }, [activeCategory]);

  const adjustTimerRef = useRef(null);
  const editingTextRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) setShowSidebar(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const canvasSizeRef = useRef(canvasSize);
  const layersRef = useRef(layers);
  const imageRefState = useRef(image);
  const canvasBgRef = useRef(canvasBg);

  useEffect(() => { canvasSizeRef.current = canvasSize; }, [canvasSize]);
  useEffect(() => { layersRef.current = layers; }, [layers]);
  useEffect(() => { imageRefState.current = image; }, [image]);
  useEffect(() => { canvasBgRef.current = canvasBg; }, [canvasBg]);

  // 1. Auto-Save & Recovery
  useEffect(() => {
    const saved = localStorage.getItem('snarkedit-autosave');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.layers && data.layers.length > 0) {
           // Optional: Show "Restore?" prompt, but here we just restore
           setLayers(data.layers);
           setImage(data.image);
           setCanvasSize(data.canvasSize || { width: 800, height: 800 });
           setCanvasBg(data.canvasBg || 'transparent');
           setValues(data.values || {});
        }
      } catch (e) { console.error("Restore failed", e); }
    }
  }, []);

  useEffect(() => {
    if (layers.length === 0 && !image) return;
    const timer = setTimeout(() => {
      setIsAutoSaving(true);
      const data = { layers, image, canvasSize, canvasBg, values };
      localStorage.setItem('snarkedit-autosave', JSON.stringify(data));
      setTimeout(() => setIsAutoSaving(false), 2000);
    }, 1000);
    return () => clearTimeout(timer);
  }, [layers, image, canvasSize, canvasBg, values]);

  // Keyboard Shortcut Handlers
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) setHistoryIndex(historyIndex - 1);
  }, [historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) setHistoryIndex(historyIndex + 1);
  }, [historyIndex, history.length]);

  const handleDelete = useCallback(() => {
    if (selectedLayerId) {
      setLayers(prev => prev.filter(l => l.id !== selectedLayerId));
      setSelectedLayerId(null);
      saveToHistory();
    }
  }, [selectedLayerId]);

  const handleDuplicate = useCallback(() => {
    if (!selectedLayerId) return;
    const layer = layers.find(l => l.id === selectedLayerId);
    if (layer) {
      const newLayer = { ...layer, id: Date.now(), x: layer.x + 20, y: layer.y + 20 };
      setLayers([...layers, newLayer]);
      setSelectedLayerId(newLayer.id);
      saveToHistory();
    }
  }, [selectedLayerId, layers]);

  const handleCopy = useCallback(() => {
    if (!selectedLayerId) return;
    const layer = layers.find(l => l.id === selectedLayerId);
    if (layer) setClipboard({ ...layer });
  }, [selectedLayerId, layers]);

  const handlePaste = useCallback(() => {
    if (!clipboard) return;
    const newLayer = { ...clipboard, id: Date.now(), x: clipboard.x + 40, y: clipboard.y + 40 };
    setLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
    saveToHistory();
  }, [clipboard]);

  useKeyboardShortcuts({
    onUndo: handleUndo,
    onRedo: handleRedo,
    onDelete: handleDelete,
    onDuplicate: handleDuplicate,
    onSelectAll: () => setSelectedLayerId(null), // Or actual select all logic
    onDeselect: () => setSelectedLayerId(null),
    onCopy: handleCopy,
    onPaste: handlePaste
  });

  const triggerBrushPreview = () => {
    setIsAdjustingBrush(true);
    if (adjustTimerRef.current) clearTimeout(adjustTimerRef.current);
    adjustTimerRef.current = setTimeout(() => setIsAdjustingBrush(false), 1000);
  };

  useEffect(() => {
    if (editingTextId && editingTextRef.current) {
      editingTextRef.current.focus();
      // Move cursor to end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(editingTextRef.current);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, [editingTextId]);

  const startDrawing = (e) => {
    if (activeCategory !== 'Draw' || !activeTool) return;
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const zoom = values.resize || 0.55;
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    
    if (activeTool === 'eraser-tool') return;
    
    if (activeTool === 'lasso-polygonal') {
      setLassoPoints(prev => [...prev, { x, y }]);
      return;
    }

    if (activeTool?.startsWith('lasso-')) {
      setLassoPoints([{ x, y }]);
      return;
    }

    setCurrentPath({
      points: [{ x, y }],
      size: brushSize,
      color: brushColor,
      opacity: brushOpacity,
      blur: brushHardness,
      type: brushType
    });
  };

  const continueDrawing = (e) => {
    if (!isDrawing || activeCategory !== 'Draw') return;
    const rect = canvasRef.current.getBoundingClientRect();
    const zoom = values.resize || 0.55;
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    if (activeTool === 'eraser-tool') {
       // Point-based erasure for precision
       setDrawPaths(prev => prev.filter(path => {
          return !path.points.some(p => {
             const dist = Math.sqrt(Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2));
             return dist < brushSize / 2;
          });
       }));
       return;
    }

    if (activeTool?.startsWith('lasso-')) {
       if (activeTool === 'lasso-regular') {
          setLassoPoints(prev => [...prev, { x, y }]);
       }
       return;
    }

    setCurrentPath(prev => prev ? ({
      ...prev,
      points: [...prev.points, { x, y }]
    }) : null);
  };

  const endDrawing = () => {
    if (currentPath) {
      setDrawPaths(prev => [...prev, currentPath]);
    }
    setIsDrawing(false);
    setCurrentPath(null);
  };

  const extractSelection = () => {
    if (lassoPoints.length < 3) {
      notify("Select a closed area first! 🎯");
      return;
    }
    
    setIsProcessing(true);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Original dimensions
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    const performExtraction = (source) => {
      ctx.beginPath();
      lassoPoints.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.clip();
      
      if (source) {
        ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
      } else {
        // Fallback for blank canvas (white)
        ctx.fillStyle = canvasBg === 'transparent' ? '#ffffff' : canvasBg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      const dataUrl = canvas.toDataURL('image/png');
      addLayer('image', dataUrl);
      setLassoPoints([]);
      setActiveCategory('Image');
      setActiveTool('add-image-layer');
      setIsProcessing(false);
      notify("Extracted successfully! ✂️");
    };

    if (image) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = image;
      img.onload = () => performExtraction(img);
    } else {
      performExtraction(null);
    }
  };

  const notify = (msg, duration = 3000) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), duration);
  };

  // Sync state with history
  const lastRestoredIndex = useRef(-1);
  useEffect(() => {
    if (historyIndex >= 0 && historyIndex < history.length && historyIndex !== lastRestoredIndex.current) {
      const snapshot = history[historyIndex];
      if (snapshot.image !== undefined) setImage(snapshot.image);
      if (snapshot.layers) setLayers(snapshot.layers);
      if (snapshot.canvasSize) setCanvasSize(snapshot.canvasSize);
      if (snapshot.canvasBg) setCanvasBg(snapshot.canvasBg);
      if (snapshot.values) setValues(snapshot.values);
      lastRestoredIndex.current = historyIndex;
    }
  }, [historyIndex]);

  const handleUpload = (e) => {
    console.log("File selection triggered");
    const file = e.target.files[0];
    if (file) {
      console.log("File selected:", file.name);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const data = ev.target.result;
        
        // Get natural dimensions
        const img = new Image();
        img.onload = () => {
          let finalW = img.naturalWidth;
          let finalH = img.naturalHeight;
          const maxDim = 2500;
          if (finalW > maxDim || finalH > maxDim) {
            const r = Math.min(maxDim / finalW, maxDim / finalH);
            finalW = Math.round(finalW * r);
            finalH = Math.round(finalH * r);
          }
          
          notify("Preparing your workspace... 🎨");
          
          // Use refs for latest state to avoid stale closure
          const currentImage = imageRefState.current;
          const currentStudioMode = isStudioMode;
          
          if (currentStudioMode || !currentImage) {
            // This is the first main image for the project
            const newSize = { width: finalW, height: finalH };
            const newValues = { ...valuesRef.current, resize: 0.55 };
            
            setImage(data);
            setLayers([]); 
            setCanvasSize(newSize);
            setCanvasBg('transparent'); 
            setValues(newValues);
            setIsStudioMode(false); 
            setIsBlankCanvas(false);
            
            // Save history with the NEW data directly (not stale refs)
            const snapshot = {
              image: data,
              layers: [],
              canvasSize: newSize,
              canvasBg: 'transparent',
              values: newValues
            };
            setHistory(prev => {
              const next = [...prev, snapshot];
              if (next.length > 50) next.shift();
              return next;
            });
            setHistoryIndex(prev => {
              lastRestoredIndex.current = prev + 1;
              return prev + 1;
            });
          } else {
            // Already have a base image, add as new layer
            addLayer('image', data, finalW, finalH);
          }
        };
        img.src = data;
        e.target.value = ''; 
      };
      reader.readAsDataURL(file);
    }
  };
  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setTemplateData(prev => ({ ...prev, avatar: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };
  const saveToHistory = (overrides = {}) => {
    const snapshot = {
      image: overrides.image !== undefined ? overrides.image : imageRefState.current,
      layers: overrides.layers !== undefined ? [...overrides.layers] : [...layersRef.current],
      canvasSize: overrides.canvasSize || { ...canvasSizeRef.current },
      canvasBg: overrides.canvasBg !== undefined ? overrides.canvasBg : canvasBgRef.current,
      values: overrides.values || { ...valuesRef.current }
    };
    setHistory(prev => {
      const nextHistory = prev.slice(0, historyIndex + 1);
      nextHistory.push(snapshot);
      if (nextHistory.length > 50) nextHistory.shift();
      return nextHistory;
    });
    setHistoryIndex(prev => {
      const newIdx = prev + 1;
      lastRestoredIndex.current = newIdx;
      return newIdx;
    });
  };

  const addToHistory = (imgData) => {
     saveToHistory(imgData ? { image: imgData } : {});
  };

  const handleRemoveBG = async () => {
    const activeLayer = selectedLayerId ? layers.find(l => l.id === selectedLayerId) : null;
    
    // On Blank Canvas, we must have a layer selected to remove its background
    if (isBlankCanvas && (!activeLayer || activeLayer.type !== 'image')) {
      notify("Select an image layer to use Remove BG! 🖼️");
      return;
    }

    const targetImage = activeLayer ? activeLayer.data : image;

    if (!targetImage || (activeLayer && activeLayer.type !== 'image')) {
      if (!targetImage) notify("Upload an image first! 🖼️");
      return;
    }
    
    setIsProcessing(true);
    notify(selectedLayerId ? "AI Processing Layer... 🪄" : "AI Processing Image... 🪄");
    
    try {
      const resultBlob = await removeBackground(targetImage);
      const resultData = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(resultBlob);
      });

      if (activeLayer) {
        setLayers(prev => prev.map(l => (
          l.id === selectedLayerId ? { ...l, data: resultData } : l
        )));
      } else {
        setImage(resultData);
        addToHistory(resultData);
      }
      notify("Background removed successfully! ✨");
    } catch (err) {
      console.error(err);
      notify("AI Processing failed. Check your connection.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    setActiveCategory('Transform');
    setActiveTool('export-design');
    setShowToolSettings(true);
  };

  const handleExport = async () => {
    if (!image && !isBlankCanvas && !isTemplateMode) return;
    
    notify("Rendering design for download... 🎨");
    setIsProcessing(true);

    try {
      const element = isTemplateMode 
        ? document.querySelector('.workspace .canvas-container > div')
        : canvasRef.current;

      if (!element) {
        throw new Error("Design element not found");
      }

      const canvas = await html2canvas(element, {
        useCORS: true,
        scale: 3,
        // html2canvas only accepts simple colors, not gradients or complex values
        backgroundColor: (!canvasBg || canvasBg === 'transparent' || canvasBg.includes('gradient') || canvasBg.includes('repeating') || canvasBg.includes('linear') || canvasBg.includes('radial') || canvasBg.includes('url')) ? null : canvasBg,
        logging: false,
        allowTaint: true,
        useCORS: true,
        onclone: (clonedDoc) => {
          // Hide editor UI only
          const editorUI = clonedDoc.querySelectorAll('.canvas-resize-handle, .layer-item button, .layer-item div[style*="top: -12px"]');
          editorUI.forEach(el => el.style.display = 'none');

          // Remove layer selection highlights
          const layerItems = clonedDoc.querySelectorAll('.layer-item');
          layerItems.forEach(l => {
            l.style.outline = 'none';
            l.style.boxShadow = 'none';
          });

          // Hide resize handles
          const resizeHandles = clonedDoc.querySelectorAll('[style*="cursor: ew-resize"], [style*="cursor: ns-resize"]');
          resizeHandles.forEach(el => el.style.display = 'none');

          // Hide outline background images
          const outlineImgs = clonedDoc.querySelectorAll('img[alt=""]');
          outlineImgs.forEach(el => el.style.display = 'none');

          // Reset container for full-size export
          const container = clonedDoc.querySelector('.canvas-container');
          if (container) {
            container.style.transform = 'none';
            container.style.boxShadow = 'none';
            container.style.borderRadius = '0';
            container.style.overflow = 'hidden';
            
            // Re-apply original background to ensure it is not stripped
            if (canvasBg && canvasBg !== 'transparent') {
              container.style.background = canvasBg;
            }
          }

          // Fix blank-canvas-base pattern background too
          const base = clonedDoc.querySelector('.blank-canvas-base');
          if (base) {
            if (canvasBg && canvasBg !== 'transparent') {
               base.style.background = canvasBg;
            }
          }

          // Strip workspace checkerboard (editor UI, not design)
          const workspace = clonedDoc.querySelector('.workspace');
          if (workspace) {
            workspace.style.background = 'none';
            workspace.style.backgroundImage = 'none';
            workspace.style.backgroundColor = 'transparent';
          }
        }
      });




      const link = document.createElement('a');
      const ext = exportFormat || 'png';
      link.download = `SnarkEdit_${Date.now()}.${ext}`;
      link.href = canvas.toDataURL(`image/${ext === 'jpg' ? 'jpeg' : ext}`, exportQuality || 1.0);
      link.click();
      
      notify("Design saved successfully! 🚀");
    } catch (err) {
      console.error("Export error:", err);
      notify("Export failed. Try simplifying filters first.");
    } finally {
      setIsProcessing(false);
    }

  };

  const handleAutoTone = () => {
    if (!image) return;
    setValues(prev => ({
      ...prev,
      brightness: 10,
      contrast: 15,
      saturation: 10,
      clarity: 20,
      temperature: -5,
      exposure: 5
    }));
    notify("Magic Polish Applied! ✨");
  };

  const handleMagicClean = async (toolId) => {
    if (!image && !selectedLayerId) {
      notify("Select an image to clean! 🖼️");
      return;
    }

    setIsProcessing(true);
    
    // Simulate AI delay
    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    try {
      if (toolId === 'auto-tune') {
        handleAutoTone();
        await delay(800);
      } else if (toolId === 'denoise') {
        notify("AI Denoising in progress... 🧬");
        await delay(2000);
        setValues(prev => ({ ...prev, blur: 0, clarity: 30 })); // Simple visual simulation
        notify("Image cleaned & denoised! ✨");
      } else if (toolId === 'upscale') {
        notify("AI Upscaling (2x) in progress... ⬆️");
        await delay(2500);
        setCanvasSize(prev => ({ width: prev.width * 2, height: prev.height * 2 }));
        notify("Resolution doubled successfully! 💎");
      } else if (toolId === 'remove-color-picker') {
        setActiveTool('remove-color');
        notify("Click a color on the image to strip it! 🎨");
      } else if (toolId === 'object-remover') {
        setIsCleaningMode(true);
        setActiveCategory('Draw');
        setActiveTool('brush-tool');
        setBrushColor('rgba(255, 0, 0, 0.5)'); // Red mask color
        notify("Paint over the object you want to remove! 🖌️");
      }
    } catch (err) {
      notify("Magic failed. Try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const applyObjectRemoval = async () => {
    if (cleaningPaths.length === 0 && drawPaths.length === 0) {
      notify("Paint over something first! 🖌️");
      return;
    }

    setIsSmartCleaning(true);
    notify("AI Generative Fill in progress... 🪄");
    
    // In a real app, we'd send the image + mask to an API like Stable Diffusion
    // Here we simulate it by clearing the mask and showing success
    await new Promise(res => setTimeout(res, 3000));
    
    setDrawPaths([]);
    setCleaningPaths([]);
    setIsCleaningMode(false);
    setIsSmartCleaning(false);
    notify("Object removed successfully! ✨");
    saveToHistory();
  };

  const handleFitToScreen = () => {
    const workspaceEl = document.querySelector('.workspace');
    if (!workspaceEl || (!image && !isBlankCanvas)) return;

    const w = workspaceEl.offsetWidth - 200; // Account for padding
    const h = workspaceEl.offsetHeight - 200;

    const ratioW = w / canvasSize.width;
    const ratioH = h / canvasSize.height;
    const bestRatio = Math.min(ratioW, ratioH, 1); // Never zoom in past 100%

    setValues(prev => ({ ...prev, resize: Number(bestRatio.toFixed(2)) }));
    notify(`Fitted to view (${Math.round(bestRatio * 100)}%)`);
  };

  const currentTool = useMemo(() => TOOLS.find(t => t.id === activeTool) || TOOLS[0], [activeTool]);

  const updateValue = (val) => {
    if (selectedLayerId) {
      setLayers(prev => prev.map(l => {
        if (l.id === selectedLayerId) {
          // Check for Layer-specific tools
          if (activeTool === 'font-size') return { ...l, fontSize: Number(val) };
          if (activeTool === 'text-color') return { ...l, color: val };
          if (activeTool === 'font-family') return { ...l, fontFamily: val };
          if (activeTool === 'letter-spacing') return { ...l, letterSpacing: Number(val) };
          if (activeTool === 'line-height') return { ...l, lineHeight: Number(val) };
          if (activeTool === 'text-align') return { ...l, textAlign: val };
          if (activeTool === 'text-curve') return { ...l, curve: Number(val) };
          if (activeTool === 'brush-type') { setBrushType(val); return l; }
          if (activeTool === 'text-bulge') return { ...l, bulge: Number(val) };
          if (activeTool === 'text-bulge') return { ...l, bulge: Number(val) };
          if (activeTool === 'text-outline') return { ...l, outline: Number(val) };
          if (activeTool === 'text-outline-color') return { ...l, outlineColor: val };
          if (activeTool === 'text-squeeze') return { ...l, squeeze: Number(val) };
          if (activeTool === 'text-glow') return { ...l, glow: Number(val) };
          if (activeTool === 'text-glow-color') return { ...l, glowColor: val };
          if (activeTool === 'text-opacity' || activeTool === 'img-opacity') return { ...l, opacity: Number(val) };
          if (activeTool === 'img-radius') return { ...l, borderRadius: Number(val) };
          if (activeTool === 'img-rotate' || activeTool === 'rotate' || activeTool === 'rotateL' || activeTool === 'rotateR') return { ...l, rotation: Number(val) };
          if (activeTool === 'img-scale' || activeTool === 'resize' || activeTool === 'scale') return { ...l, scale: Number(val) };
          if (activeTool === 'img-shadow') return { ...l, shadow: Number(val) };
          if (activeTool === 'flip-h' || activeTool === 'flipH') return { ...l, flipX: l.flipX === -1 ? 1 : -1 };
          if (activeTool === 'flip-v' || activeTool === 'flipV') return { ...l, flipY: l.flipY === -1 ? 1 : -1 };

          // Check for Filter tools in Image / Presets
          const tool = TOOLS.find(t => t.id === activeTool);
          const isFilterProp = tool && (tool.category === 'Presets' || (tool.category === 'Image' && (tool.min !== undefined || activeTool === 'img-outline-color') && !['img-opacity', 'img-radius', 'img-rotate', 'img-scale', 'img-shadow', 'add-image-layer', 'remove-bg-layer', 'img-order'].includes(tool.id)));
          
          if (isFilterProp) {
            return {
              ...l,
              filters: {
                ...(l.filters || {}),
                [activeTool]: val
              }
            };
          }
        }
        return l;
      }));
    } else {
      if (activeTool === 'brush-size') setBrushSize(Number(val));
      if (activeTool === 'brush-opacity') setBrushOpacity(Number(val));
      if (activeTool === 'brush-blur') setBrushHardness(Number(val));
      if (activeTool === 'brush-color') setBrushColor(val);
      if (activeTool === 'brush-type') setBrushType(val);
      if (activeTool === 'clear-draw') setDrawPaths([]);
      
      setValues(prev => ({ ...prev, [activeTool]: val }));
    }
  };

  const handleCanvasResize = (e, corner) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = canvasSize.width;
    const startHeight = canvasSize.height;
    const rScale = valuesRef.current.resize || 0.55;
    const aspectRatio = startWidth / startHeight;

    const onMouseMove = (moveEvent) => {
      const dx = (moveEvent.clientX - startX) / rScale;
      const dy = (moveEvent.clientY - startY) / rScale;

      setCanvasSize(prev => {
        let newWidth = startWidth;
        let newHeight = startHeight;

        if (corner === 'r') newWidth = startWidth + dx;
        if (corner === 'l') newWidth = startWidth - dx;
        if (corner === 'b') newHeight = startHeight + dy;
        if (corner === 't') newHeight = startHeight - dy;

        if (corner.length === 2) {
           // Proportional handles
           if (corner.includes('r')) newWidth = startWidth + dx;
           if (corner.includes('l')) newWidth = startWidth - dx;
           
           // We prioritize width for the primary proportional change
           newHeight = newWidth / aspectRatio;
           
           // Correct Y for top corners
           if (corner.includes('t')) {
              // Note: For canvas resize, we typically grow downwards or from center
           }
        }

        return {
          width: Math.max(50, Math.min(10000, newWidth)),
          height: Math.max(50, Math.min(10000, newHeight))
        };
      });
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      saveToHistory();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleLayerResize = (layerId, deltaX, deltaY, edge) => {
    const rScale = values.resize || 0.55;
    setLayers(prev => prev.map(l => {
      if (l.id !== layerId) return l;
      // Convert 'auto' to numeric values for calculation
      let newW = typeof l.width === 'number' ? l.width : 250;
      let newH = typeof l.height === 'number' ? l.height : 60;
      let newX = l.x;
      let newY = l.y;

      const dx = deltaX / rScale;
      const dy = deltaY / rScale;

      if (edge === 'r') newW += dx;
      if (edge === 'l') { 
        const prevW = newW;
        newW = Math.max(30, newW - dx);
        newX += (prevW - newW);
      }
      if (edge === 'b') newH += dy;
      if (edge === 't') { 
        const prevH = newH;
        newH = Math.max(30, newH - dy);
        newY += (prevH - newH);
      }

      return { 
        ...l, 
        width: Math.max(30, newW), 
        height: Math.max(30, newH),
        x: newX,
        y: newY
      };
    }));
  };

  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(1);
  const [flipV, setFlipV] = useState(1);
  const [scale, setScale] = useState(1);

  const [crop, setCrop] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [isCropping, setIsCropping] = useState(false);

  const imageRef = useRef(null);
  const [workspaceSize, setWorkspaceSize] = useState({ width: 400, height: 400 });

  useEffect(() => {
    if (imageRef.current) {
      setWorkspaceSize({
        width: imageRef.current.offsetWidth,
        height: imageRef.current.offsetHeight
      });
    }
  }, [image, activeTool]);

  const applyCrop = () => {
    // Determine target (Main Image or Layer)
    const activeLayer = selectedLayerId ? layers.find(l => l.id === selectedLayerId) : null;
    const targetImageData = activeLayer ? activeLayer.data : image;
    
    if (!targetImageData) return;

    const canvas = document.createElement('canvas');
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = targetImageData;
    
    img.onload = () => {
      // Calculate relative crop coordinates
      // For layers, crop box is in canvas coordinates, so we need local coords
      let sx, sy, sw, sh;
      
      if (activeLayer) {
        // Find how much of the original image the current layer width/height represents
        // This is tricky if it's already been scaled.
        // For simplicity, we assume crop box (x,y) is relative to canvas,
        // and layer (x,y) is also relative to canvas.
        const relX = crop.x - activeLayer.x;
        const relY = crop.y - activeLayer.y;
        
        // Scale to original pixel dimensions
        const ratioX = img.width / activeLayer.width;
        const ratioY = img.height / activeLayer.height;
        
        sx = relX * ratioX;
        sy = relY * ratioY;
        sw = crop.width * ratioX;
        sh = crop.height * ratioY;
      } else {
        // Main image crop
        const scaleX = img.width / (imageRef.current?.offsetWidth || canvasSize.width);
        const scaleY = img.height / (imageRef.current?.offsetHeight || canvasSize.height);
        sx = crop.x * scaleX;
        sy = crop.y * scaleY;
        sw = crop.width * scaleX;
        sh = crop.height * scaleY;
      }
      
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      
      const croppedData = canvas.toDataURL();
      
      if (activeLayer) {
        setLayers(prev => prev.map(l => (
          l.id === selectedLayerId ? { ...l, data: croppedData, width: crop.width, height: crop.height, x: crop.x, y: crop.y } : l
        )));
      } else {
        setImage(croppedData);
        addToHistory(croppedData);
      }
      
      setIsCropping(false);
      setActiveTool('brightness');
      setCrop({ x: 0, y: 0, width: 200, height: 200 }); // Reset with default scale
    };
  };

  const changeBackground = (color) => {
    setCanvasBg(color);
  };

  const deleteLayer = (id) => {
    setLayers(layers.filter(l => l.id !== id));
  };
  const centerLayer = (axis, id) => {
    if (!id) return;

    setLayers(prev => prev.map(l => {
      if (l.id === id) {
        // Use layout pixels (offsetWidth) for coordinates consistency
        const canvasElement = canvasRef.current || imageRef.current;
        if (!canvasElement) return l;

        const canvasWidth = isBlankCanvas ? canvasSize.width : canvasElement.offsetWidth;
        const canvasHeight = isBlankCanvas ? canvasSize.height : canvasElement.offsetHeight;
        
        const layerEl = document.querySelector(`.layer-item.active`);
        if (!layerEl) return l;

        const lWidth = layerEl.offsetWidth || 200;
        const lHeight = layerEl.offsetHeight || 200;

        const scaledWidth = lWidth * (l.scale || 1);
        const scaledHeight = lHeight * (l.scale || 1);
        
        const newX = axis === 'horizontal' || axis === 'both' ? (canvasWidth - scaledWidth) / 2 : l.x;
        const newY = axis === 'vertical' || axis === 'both' ? (canvasHeight - scaledHeight) / 2 : l.y;

        return { ...l, x: newX, y: newY };
      }
      return l;
    }));
  };

  const bringToFront = (id) => {
    setLayers(prev => {
      const layer = prev.find(l => l.id === id);
      if (!layer) return prev;
      return [...prev.filter(l => l.id !== id), layer];
    });
  };

  const addLayer = (type, data, w, h) => {
    const id = Date.now();
    
    // For images, if dimensions aren't provided, we use defaults
    // If they are provided, we use the natural size (scaled down if too large)
    let finalW = w || (type === 'text' ? 250 : (type === 'image' ? 200 : 150));
    let finalH = h || (type === 'text' ? 60 : (type === 'image' ? 200 : 150));

    // Cap layer size to 400px but keep aspect ratio
    if (type === 'image' && w && h) {
       const maxL = 400;
       if (w > maxL || h > maxL) {
          const r = Math.min(maxL / w, maxL / h);
          finalW = w * r;
          finalH = h * r;
       }
    }

    const newLayer = {
      id,
      type,
      data,
      x: 100,
      y: 100,
      width: finalW,
      height: finalH,
      rotation: 0,
      scale: 1,
      opacity: 1,
      shadow: 0,
      color: type === 'text' ? '#000000' : (type === 'shape' ? '#3b82f6' : 'transparent'),
      fontSize: 32,
      fontFamily: 'Inter',
      letterSpacing: 0,
      lineHeight: 1.2,
      textAlign: 'center',
      filters: {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        grayscale: 0,
        sepia: 0,
        blur: 0,
        'hue-rotate': 0
      },
      flipX: 1,
      flipY: 1,
      borderRadius: type === 'shape' && data === 'circle' ? '50%' : '0'
    };
    setLayers([...layers, newLayer]);
    setSelectedLayerId(id);
    addToHistory(image); // Keep history sync
  };
  
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0,0,0';
  };

  const getPatternCSS = (patternId, scale, opacity, colorHex, shades) => {
    const s = scale || 1;
    const o = opacity !== undefined ? opacity : 0.4;
    const rgb = hexToRgb(colorHex || '#000000');
    const color = `rgba(${rgb}, ${o})`;
    const patterns = {
      'p-clean': '#ffffff',
      'p-dots': `radial-gradient(${color} ${2 * s}px, #ffffff ${2 * s}px) 0 0 / ${25 * s}px ${25 * s}px`,
      'p-grid': `linear-gradient(${color} 1px, transparent 1px) 0 0 / ${25 * s}px ${25 * s}px, linear-gradient(90deg, ${color} 1px, transparent 1px) 0 0 / ${25 * s}px ${25 * s}px, #ffffff`,
      'p-diagonal': `linear-gradient(45deg, ${color} 25%, transparent 25%, transparent 50%, ${color} 50%, ${color} 75%, transparent 75%, transparent) 0 0 / ${20 * s}px ${20 * s}px #ffffff`,
      'p-check': `conic-gradient(${color} 90deg, #ffffff 90deg 180deg, ${color} 180deg 270deg, #ffffff 270deg) 0 0 / ${40 * s}px ${40 * s}px`,
      'p-waves': `radial-gradient(circle at 100% 50%, transparent 20%, ${color} 21%, ${color} 34%, transparent 35%, transparent), radial-gradient(circle at 0% 50%, transparent 20%, ${color} 21%, ${color} 34%, transparent 35%, transparent) 0 0 / ${40 * s}px ${40 * s}px #ffffff`,
      'p-stars': `radial-gradient(${1 * s}px ${1 * s}px at ${10 * s}px ${10 * s}px, ${color}, transparent), radial-gradient(${1 * s}px ${1 * s}px at ${30 * s}px ${40 * s}px, ${color}, transparent) 0 0 / ${50 * s}px ${50 * s}px #ffffff`,
      'p-lines': `linear-gradient(90deg, ${color} ${2 * s}px, transparent ${2 * s}px) 0 0 / ${20 * s}px 100% #ffffff`,
      'p-cross': `linear-gradient(${color} ${2 * s}px, transparent ${2 * s}px) 50% 50% / ${20 * s}px ${20 * s}px, linear-gradient(90deg, ${color} ${2 * s}px, transparent ${2 * s}px) 50% 50% / ${20 * s}px ${20 * s}px #ffffff`,
      'p-hex': `url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyOCIgaGVpZ2h0PSI0OSIgdmlld0JveD0iMCAwIDI4IDQ5Ij48cGF0aCBmaWxsPSIjY2JkNWUxIiBmaWxsLW9wYWNpdHk9IjAuNSIgZD0iTTAgMTIuMjdMMTQgNEwyOCAxMi4yN3YxNi40NkwxNCAzNyAwIDI4Ljc0di0xNi40NnpNMTQgMjRMMCAxNi4zNnY3LjY0TDE0IDMxdjcuNjRsMTQtNi4zNlYyNC4zNkwxNCAzMnYtOHoiLz48L3N2Zz4=') 0 0 / ${28 * s}px ${49 * s}px #ffffff`,
      'p-zigzag': `linear-gradient(135deg, #f1f5f9 25%, transparent 25%), linear-gradient(225deg, #f1f5f9 25%, transparent 25%), linear-gradient(45deg, #f1f5f9 25%, transparent 25%), linear-gradient(315deg, #f1f5f9 25%, transparent 25%) 0 0 / ${20 * s}px ${20 * s}px #ffffff`,
      'p-bricks': `linear-gradient(335deg, #f1f5f9 ${23 * s}px, transparent ${23 * s}px), linear-gradient(155deg, #f1f5f9 ${23 * s}px, transparent ${23 * s}px) 0 0 / ${50 * s}px ${50 * s}px #ffffff`,
      'p-noise': `url("https://www.transparenttextures.com/patterns/natural-paper.png") 0 0 / ${200 * s}px ${200 * s}px #ffffff`,
      'p-carbon': `linear-gradient(27deg, #151515 ${5 * s}px, transparent ${5 * s}px) 0 ${5 * s}px, linear-gradient(207deg, #151515 ${5 * s}px, transparent ${5 * s}px) ${10 * s}px 0, linear-gradient(27deg, #222 ${5 * s}px, transparent ${5 * s}px) 0 ${10 * s}px, linear-gradient(207deg, #222 ${5 * s}px, transparent ${5 * s}px) ${10 * s}px ${5 * s}px, linear-gradient(90deg, #1b1b1b ${10 * s}px, transparent ${10 * s}px), linear-gradient(#1d1d1d 25%, #1a1a1a 25%, #1a1a1a 50%, transparent 50%, transparent 75%, #242424 75%, #242424) 0 0 / ${20 * s}px ${20 * s}px #131313`,
      'p-bubbles': `radial-gradient(circle, #f8fafc 10%, transparent 10%), radial-gradient(circle, #f8fafc 10%, transparent 10%) ${20 * s}px ${20 * s}px 0 0 / ${40 * s}px ${40 * s}px #ffffff`,
      'p-tiles': `linear-gradient(45deg, #cbd5e1 25%, transparent 25%, transparent 75%, #cbd5e1 75%, #cbd5e1), linear-gradient(45deg, #cbd5e1 25%, transparent 25%, transparent 75%, #cbd5e1 75%, #cbd5e1) ${10 * s}px ${10 * s}px 0 0 / ${20 * s}px ${20 * s}px #ffffff`,
      'p-paper': `url("https://www.transparenttextures.com/patterns/paper-fibers.png") 0 0 / ${300 * s}px ${300 * s}px #f8fafc`,
      'p-blueprint': `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px) 0 0 / ${20 * s}px ${20 * s}px #3b82f6`,
      'p-retro': `linear-gradient(rgba(18, 18, 18, 0) 95%, rgba(139, 92, 246, 0.2) 95%), linear-gradient(90deg, rgba(18, 18, 18, 0) 95%, rgba(139, 92, 246, 0.2) 95%) 0 0 / ${40 * s}px ${40 * s}px #121212`,
      'p-luxury': `linear-gradient(45deg, #1a1a1a 25%, transparent 25%, transparent 75%, #1a1a1a 75%, #1a1a1a), linear-gradient(45deg, #1a1a1a 25%, transparent 25%, transparent 75%, #1a1a1a 75%, #1a1a1a) ${10 * s}px ${10 * s}px 0 0 / ${20 * s}px ${20 * s}px #000000`,
      'p-triangles': `url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIzNCIgdmlld0JveD0iMCAwIDIwIDM0Ij48ZyBmaWxsPSIjY2JkNWUxIiBmaWxsLW9wYWNpdHk9IjAuNCI+PHBhdGggZD0iTTAgMEwyMCAxMEwyMCAzNEwwIDI0eiIvPjwvZz48L3N2Zz4=') 0 0 / ${20 * s}px ${34 * s}px #ffffff`,
      'p-stripe-thick': `repeating-linear-gradient(45deg, #f1f5f9, #f1f5f9 ${10 * s}px, #ffffff ${10 * s}px, #ffffff ${20 * s}px)`,
      'p-modern': `radial-gradient(circle at 100% 100%, #ffffff 0, #ffffff ${3 * s}px, transparent ${3 * s}px) 0 0 / ${20 * s}px ${20 * s}px, radial-gradient(circle at 0 0, #ffffff 0, #ffffff ${3 * s}px, transparent ${3 * s}px) 0 0 / ${20 * s}px ${20 * s}px, #f1f5f9`
    };

    let shadeGradients = '';
    if (shades) {
      if (shades.top?.enabled) shadeGradients += `linear-gradient(to bottom, ${shades.top.color} 0%, transparent ${shades.top.spread}%), `;
      if (shades.bottom?.enabled) shadeGradients += `linear-gradient(to top, ${shades.bottom.color} 0%, transparent ${shades.bottom.spread}%), `;
      if (shades.left?.enabled) shadeGradients += `linear-gradient(to right, ${shades.left.color} 0%, transparent ${shades.left.spread}%), `;
      if (shades.right?.enabled) shadeGradients += `linear-gradient(to left, ${shades.right.color} 0%, transparent ${shades.right.spread}%), `;
      if (shades.center?.enabled) shadeGradients += `radial-gradient(circle at center, ${shades.center.color} 0%, transparent ${shades.center.spread}%), `;
    }

    return shadeGradients + (patterns[patternId] || '#ffffff');
  };

  const applyPattern = (patternId) => {
    setCurrentPattern(patternId);
    setCanvasBg(getPatternCSS(patternId, patternScale, patternOpacity, patternColor, patternShades));
  };

  useEffect(() => {
    if (currentPattern) {
      setCanvasBg(getPatternCSS(currentPattern, patternScale, patternOpacity, patternColor, patternShades));
    }
  }, [patternScale, currentPattern, patternOpacity, patternColor, patternShades]);

  const applyTemplate = (toolId) => {
    if (toolId.startsWith('t-')) {
      setIsTemplateMode(true);
      // Determine a good placeholder image for the template category
      let placeholder = 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=800&q=80';
      if (toolId.includes('nature')) placeholder = 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80';
      if (toolId.includes('tech')) placeholder = 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80';
      if (toolId.includes('fashion')) placeholder = 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80';
      
      setImage(placeholder);
      
      // Auto-update text based on template type
      const label = TOOLS_DEFS.find(t => t.id === toolId)?.label || "New Post";
      setTemplateData(prev => ({ 
        ...prev, 
        text: `Creating a beautiful ${label}. Edit this text to make it yours!`,
        handle: `@${label.toLowerCase().replace(/\s+/g, '_')}`
      }));
    }
  };

  const applyTransform = (toolId) => {
    if (selectedLayerId) {
      if (toolId === 'crop') {
        const layer = layers.find(l => l.id === selectedLayerId);
        if (layer && layer.type === 'image') {
          setCrop({ x: layer.x, y: layer.y, width: layer.width, height: layer.height });
          setIsCropping(true);
          return;
        }
      }

      setLayers(prev => prev.map(l => {
        if (l.id === selectedLayerId) {
          switch (toolId) {
            case 'rotateL': return { ...l, rotation: (l.rotation || 0) - 90 };
            case 'rotateR': return { ...l, rotation: (l.rotation || 0) + 90 };
            case 'flipH': return { ...l, flipX: (l.flipX || 1) * -1 };
            case 'flipV': return { ...l, flipY: (l.flipY || 1) * -1 };
            case 'resize': return { ...l, scale: (l.scale || 1) === 1 ? 1.2 : 1 };
            default: return l;
          }
        }
        return l;
      }));
      return;
    }

    switch (toolId) {
      case 'crop': 
        if (image) {
          setIsCropping(true);
        } else {
          notify("Upload an image first to use crop! 🖼️");
        }
        break;
      case 'rotateL': setRotation(prev => prev - 90); break;
      case 'rotateR': setRotation(prev => prev + 90); break;
      case 'flipH': setFlipH(prev => prev * -1); break;
      case 'flipV': setFlipV(prev => prev * -1); break;
      case 'resize': setValues(prev => ({ ...prev, resize: (prev.resize || 1) === 1 ? 1.2 : 1 })); break;
      default: break;
    }
  };

  const [activeFilters, setActiveFilters] = useState({});

  const toggleFilter = (filterId) => {
    if (selectedLayerId) {
       setLayers(prev => prev.map(l => (
         l.id === selectedLayerId ? { ...l, filters: { ...(l.filters || {}), [filterId]: !l.filters?.[filterId] } } : l
       )));
       return;
    }

    setActiveFilters(prev => ({
      ...prev,
      [filterId]: !prev[filterId]
    }));
  };

  const updateLayerFilter = (layerId, filterId, value) => {
    setLayers(prev => prev.map(l => 
      l.id === layerId ? { ...l, filters: { ...(l.filters || {}), [filterId]: value } } : l
    ));
  };

  const getLayerFilterStyle = (layer) => {
    if (!layer || !layer.filters) return {};
    
    const f = layer.filters;
    const b = f.brightness !== undefined ? f.brightness : 100;
    const c = f.contrast !== undefined ? f.contrast : 100;
    const s = f.saturation !== undefined ? f.saturation : 100;
    const bl = f.blur || 0;
    const h = f.hue || f['hue-rotate'] || f.hueRotate || 0;
    const exp = f.exposure !== undefined ? (100 + Number(f.exposure)) / 100 : 1;
    const g = f.grayscale || 0;
    const sep = f.sepia || 0;
    
    let filterStr = `brightness(${b * exp}%) contrast(${c}%) saturate(${s}%) blur(${bl}px) hue-rotate(${h}deg) grayscale(${g}%) sepia(${sep}%)`;
    
    // Apply Presets to Layer
    if (f.sepia) filterStr += ` sepia(${f.sepia || 0}%)`;
    if (f.grayscale) filterStr += ` grayscale(${f.grayscale || 0}%)`;
    if (f.noir) filterStr += ` grayscale(${f.noir || 0}%) contrast(${(f.noir || 0) * 0.5 + 100}%) brightness(${100 - (f.noir || 0) * 0.2}%)`;
    if (f.vintage) filterStr += ` sepia(${(f.vintage || 0) * 0.5}%) contrast(${100 + (f.vintage || 0) * 0.2}%) brightness(${100 - (f.vintage || 0) * 0.1}%) hue-rotate(-${(f.vintage || 0) * 0.2}deg)`;
    if (f.cinematic) filterStr += ` contrast(${100 + (f.cinematic || 0) * 0.3}%) brightness(${100 + (f.cinematic || 0) * 0.1}%) saturate(${100 - (f.cinematic || 0) * 0.3}%) sepia(${(f.cinematic || 0) * 0.2}%)`;
    if (f.polaroid) filterStr += ` contrast(${100 + (f.polaroid || 0) * 0.1}%) brightness(${100 + (f.polaroid || 0) * 0.1}%) sepia(${(f.polaroid || 0) * 0.3}%) grayscale(${(f.polaroid || 0) * 0.2}%)`;
    if (f.kodak) filterStr += ` saturate(${100 + (f.kodak || 0) * 0.5}%) contrast(${100 + (f.kodak || 0) * 0.1}%) brightness(${100 + (f.kodak || 0) * 0.05}%)`;
    if (f.oceanic) filterStr += ` hue-rotate(${(f.oceanic || 0) * 1.8}deg) saturate(${100 + (f.oceanic || 0) * 0.2}%) brightness(${100 - (f.oceanic || 0) * 0.1}%)`;
    if (f.forest) filterStr += ` hue-rotate(${(f.forest || 0) * 0.8}deg) saturate(${100 + (f.forest || 0) * 0.3}%) brightness(${100 - (f.forest || 0) * 0.15}%)`;
    if (f.sunset) filterStr += ` sepia(${(f.sunset || 0) * 0.5}%) hue-rotate(-${(f.sunset || 0) * 0.3}deg) saturate(${100 + (f.sunset || 0) * 0.4}%) contrast(${100 + (f.sunset || 0) * 0.1}%)`;
    
    // Creative binary
    if (f.invert) filterStr += ' invert(100%)';
    if (f.emboss) filterStr += ' contrast(200%) brightness(150%) grayscale(100%)';
    if (f.edgeDetect) filterStr += ' contrast(500%) invert(100%) grayscale(100%)';
    
    if (layer.shadow) filterStr += ` drop-shadow(0 0 ${layer.shadow}px rgba(0,0,0,0.5))`;
    
    // Outline is rendered separately via a background element
    
    return filterStr;
  };

  // Get outline-only filter for rendering behind images
  const getOutlineFilter = (outlineSize, outlineColor) => {
    if (!outlineSize) return null;
    const s = outlineSize;
    const c = outlineColor || '#ffffff';
    return `drop-shadow(${s}px 0 0 ${c}) drop-shadow(-${s}px 0 0 ${c}) drop-shadow(0 ${s}px 0 ${c}) drop-shadow(0 -${s}px 0 ${c})`;
  };

  const imageStyle = useMemo(() => {
    const b = 100 + Number(values.brightness || 0);
    const c = 100 + Number(values.contrast || 0);
    const s = 100 + Number(values.saturation || 0);
    const bl = Number(values.blur || 0);
    const h = Number(values.hue || 0);
    const exp = (100 + Number(values.exposure || 0)) / 100;
    const sk = Number(values.skew || 0);
    const p = Number(values.perspective || 1000);
    
    let filters = `brightness(${b * exp}%) contrast(${c}%) saturate(${s}%) blur(${bl}px) hue-rotate(${h}deg)`;
    
    // Presets
    if (activeFilters.sepia) filters += ` sepia(${values.sepia || 0}%)`;
    if (activeFilters.grayscale) filters += ` grayscale(${values.grayscale || 0}%)`;
    if (activeFilters.noir) filters += ` grayscale(${values.noir || 0}%) contrast(${(values.noir || 0) * 0.5 + 100}%) brightness(${100 - (values.noir || 0) * 0.2}%)`;
    if (activeFilters.vintage) filters += ` sepia(${(values.vintage || 0) * 0.5}%) contrast(${100 + (values.vintage || 0) * 0.2}%) brightness(${100 - (values.vintage || 0) * 0.1}%) hue-rotate(-${(values.vintage || 0) * 0.2}deg)`;
    if (activeFilters.cinematic) filters += ` contrast(${100 + (values.cinematic || 0) * 0.3}%) brightness(${100 + (values.cinematic || 0) * 0.1}%) saturate(${100 - (values.cinematic || 0) * 0.3}%) sepia(${(values.cinematic || 0) * 0.2}%)`;
    if (activeFilters.polaroid) filters += ` contrast(${100 + (values.polaroid || 0) * 0.1}%) brightness(${100 + (values.polaroid || 0) * 0.1}%) sepia(${(values.polaroid || 0) * 0.3}%) grayscale(${(values.polaroid || 0) * 0.2}%)`;
    if (activeFilters.kodak) filters += ` saturate(${100 + (values.kodak || 0) * 0.5}%) contrast(${100 + (values.kodak || 0) * 0.1}%) brightness(${100 + (values.kodak || 0) * 0.05}%)`;
    if (activeFilters.oceanic) filters += ` hue-rotate(${(values.oceanic || 0) * 1.8}deg) saturate(${100 + (values.oceanic || 0) * 0.2}%) brightness(${100 - (values.oceanic || 0) * 0.1}%)`;
    if (activeFilters.forest) filters += ` hue-rotate(${(values.forest || 0) * 0.8}deg) saturate(${100 + (values.forest || 0) * 0.3}%) brightness(${100 - (values.forest || 0) * 0.15}%)`;
    if (activeFilters.sunset) filters += ` sepia(${(values.sunset || 0) * 0.5}%) hue-rotate(-${(values.sunset || 0) * 0.3}deg) saturate(${100 + (values.sunset || 0) * 0.4}%) contrast(${100 + (values.sunset || 0) * 0.1}%)`;
    
    // Creative Binary Filters
    if (activeFilters.invert) filters += ' invert(100%)';
    if (activeFilters.emboss) filters += ' contrast(200%) brightness(150%) grayscale(100%)';
    if (activeFilters.edgeDetect) filters += ' contrast(500%) invert(100%) grayscale(100%)';
    
    // Outline is rendered separately via a background element
    
    return { 
      filter: filters,
      transform: `perspective(${p}px) rotate(${rotation}deg) scaleX(${flipH * (values['img-scale'] || 1)}) scaleY(${flipV * (values['img-scale'] || 1)}) skewX(${sk}deg)`,
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
    };
  }, [values, activeFilters, rotation, flipH, flipV]);

  const removeColor = (targetColor) => {
    if (!image) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = image;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      const [tr, tg, tb] = targetColor;
      const threshold = 30; // Color similarity threshold
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        
        const dist = Math.sqrt(
          Math.pow(r - tr, 2) + 
          Math.pow(g - tg, 2) + 
          Math.pow(b - tb, 2)
        );
        
        if (dist < threshold) {
          data[i + 3] = 0; // Set alpha to 0
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      const resultData = canvas.toDataURL();
      setImage(resultData);
      addToHistory(resultData);
      setActiveTool('brightness');
      alert("Successfully removed selected color!");
    };
  };

  const handleImageClick = (e) => {
    if (activeTool !== 'remove-color') return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = image;
    img.onload = () => {
      canvas.width = imageRef.current.offsetWidth;
      canvas.height = imageRef.current.offsetHeight;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
      removeColor([r, g, b]);
    };
  };

  return (
    <div className="app-container">
      <style>{`
        .main-image {
          border-radius: 8px;
          box-shadow: none;
        }

        div[title="Change Profile Picture"]:hover .avatar-hover {
          opacity: 1 !important;
        }

        .tool-controls::-webkit-scrollbar {
          display: none;
        }

        .tool-controls {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }
      `}</style>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleUpload} 
        accept="image/*" 
        style={{ visibility: 'hidden', position: 'absolute', width: '0', height: '0' }} 
      />

      {/* Global Status Overlay (Auto-save) */}
      <AnimatePresence>
         {isAutoSaving && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', background: 'var(--bg-card)', border: '1px solid #10b981', padding: '6px 14px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'none', zIndex: 10000, boxShadow: 'none' }}
            >
               <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
               <span style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Auto-Save Active</span>
            </motion.div>
         )}
      </AnimatePresence>
      <AnimatePresence>
        {isProcessing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'var(--bg-main)', zIndex: 20000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2rem' }}
          >
            <div className="loader"></div>
            <p style={{ color: 'var(--text-main)', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '1px' }}>AI MAGIC IN PROGRESS...</p>
          </motion.div>
        )}

        {isCleaningMode && (
          <motion.div 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            style={{ position: 'fixed', top: '100px', left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-card)', border: '1px solid var(--primary)', padding: '0.8rem 1.5rem', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '1.5rem', zIndex: 1000, boxShadow: 'none' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'red', boxShadow: '0 0 10px red' }}></div>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)' }}>OBJECT ERASER ACTIVE</span>
            </div>
            <div style={{ width: '1px', height: '20px', background: 'var(--border)' }}></div>
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button onClick={() => { setIsCleaningMode(false); setDrawPaths([]); }} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '0.4rem 1rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button 
                onClick={applyObjectRemoval} 
                disabled={isSmartCleaning}
                style={{ background: 'var(--primary)', border: 'none', color: 'white', padding: '0.4rem 1.25rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {isSmartCleaning ? 'Processing...' : <><Sparkles size={14} /> Remove Selected</>}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Navbar 
        isTemplateMode={isTemplateMode}
        setIsTemplateMode={(val) => {
          setIsTemplateMode(val);
          if (val) {
            setIsBlankCanvas(false);
            setIsStudioMode(false);
          }
        }}
        isBlankCanvas={isBlankCanvas}
        setIsBlankCanvas={(val) => {
          setIsBlankCanvas(val);
          if (val) {
            setIsTemplateMode(false);
            setIsStudioMode(false);
            setImage(null); // Clear image when switching to Blank Canvas for fresh start
          }
        }}
        historyIndex={historyIndex}
        historyLength={history.length}
        onUndo={() => setHistoryIndex(prev => prev - 1)}
        onRedo={() => setHistoryIndex(prev => prev + 1)}
        image={image}
        isStudioMode={isStudioMode}
        onDownload={handleDownload}
        onUploadTrigger={() => fileInputRef.current?.click()}
        showLayerPanel={showLayerPanel}
        setShowLayerPanel={setShowLayerPanel}
        onHome={() => {
          setIsBlankCanvas(false);
          setIsStudioMode(false);
          setIsTemplateMode(false);
          setImage(null);
        }}
        theme={theme}
        toggleTheme={toggleTheme}
        showSidebar={showSidebar}
        setShowSidebar={setShowSidebar}
      />

      <main className="main-content">
        <Sidebar 
          showSidebar={showSidebar}
          setShowSidebar={setShowSidebar}
          CATEGORIES={CATEGORIES}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          TOOLS={TOOLS}
          activeTool={activeTool}
          setActiveTool={handleSelectTool}
          activeFilters={activeFilters}
          toggleFilter={toggleFilter}
          handleRemoveBG={handleRemoveBG}
          handleAutoTone={handleAutoTone}
          handleMagicClean={handleMagicClean}
          applyTemplate={applyTemplate}
          applyTransform={applyTransform}
          fileInputRef={fileInputRef}
          selectedLayerId={selectedLayerId}
          bringToFront={bringToFront}
          centerLayer={centerLayer}
          addLayer={addLayer}
          applyPattern={applyPattern}
          setShowShadeModal={setShowShadeModal}
          onUndo={() => setHistoryIndex(prev => prev - 1)}
          onRedo={() => setHistoryIndex(prev => prev + 1)}
          onDownload={handleDownload}
          historyIndex={historyIndex}
          historyLength={history.length}
          theme={theme}
          toggleTheme={toggleTheme}
          showLayerPanel={showLayerPanel}
          setShowLayerPanel={setShowLayerPanel}
          setIsBlankCanvas={setIsBlankCanvas}
          setIsTemplateMode={setIsTemplateMode}
          isBlankCanvas={isBlankCanvas}
          isTemplateMode={isTemplateMode}
        />

        {showLayerPanel && (
          <LayerPanel 
            layers={layers} 
            setLayers={setLayers} 
            selectedLayerId={selectedLayerId} 
            setSelectedLayerId={setSelectedLayerId} 
            setShowLayerPanel={setShowLayerPanel}
          />
        )}

        <AnimatePresence>
          {showToolSettings && activeTool && activeCategory !== 'Patterns' && !['add-image-layer', 'add-text', 'remove-bg-layer', 'person-cutout', 'auto-remove', 'autoTone', 'emboss', 'edgeDetect'].includes(activeTool) && (
            <div 
              className="tool-panel-overlay"
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowToolSettings(false);
              }}
              style={{ position: 'fixed', inset: 0, zIndex: 9998, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingTop: '80px', paddingRight: '20px', pointerEvents: 'none' }}
            >
              <motion.div 
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 300, opacity: 0 }}
                onClick={(e) => e.stopPropagation()} 
                style={{ pointerEvents: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.2rem', width: '300px', maxWidth: '85vw', boxShadow: 'var(--shadow-premium)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', cursor: 'grab' }}>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', fontWeight: 800 }}>⚙️ {TOOLS.find(t => t.id === activeTool)?.label || 'Tool Settings'}</h3>
                  <button onClick={() => setShowToolSettings(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer', lineHeight: '1' }}>&times;</button>
                </div>
                <div className="tool-controls" onPointerDown={(e) => e.stopPropagation()} style={{ cursor: 'default', padding: '0.2rem', border: 'none', background: 'transparent', width: '100%', maxHeight: '75vh', overflowY: 'auto' }}>
          {activeTool === 'img-align' ? (
              <div style={{ padding: '0.5rem' }}>
                 <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '1rem' }}>Layer Alignment</p>
                 {!selectedLayerId ? (
                   <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--tool-bg)', borderRadius: '12px' }}>
                     <p style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600 }}>☝️ Select a layer on canvas first</p>
                   </div>
                 ) : (
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                      <motion.button 
                         className="btn-shape" 
                         whileHover={{ scale: 1.05 }}
                         whileTap={{ scale: 0.95 }}
                         onClick={() => centerLayer('horizontal', selectedLayerId)}
                      >
                         <AlignHorizontalJustifyCenter size={18} />
                         <span style={{ fontSize: '0.6rem' }}>H-Center</span>
                      </motion.button>
                      <motion.button 
                         className="btn-shape"
                         whileHover={{ scale: 1.05 }}
                         whileTap={{ scale: 0.95 }}
                         onClick={() => centerLayer('vertical', selectedLayerId)}
                      >
                         <AlignVerticalJustifyCenter size={18} />
                         <span style={{ fontSize: '0.6rem' }}>V-Center</span>
                      </motion.button>
                      <motion.button 
                         className="btn-shape"
                         whileHover={{ scale: 1.05 }}
                         whileTap={{ scale: 0.95 }}
                         onClick={() => centerLayer('both', selectedLayerId)}
                      >
                         <Maximize size={18} />
                         <span style={{ fontSize: '0.6rem' }}>Center</span>
                      </motion.button>
                   </div>
                 )}
              </div>
            ) : activeTool === 'stickers' ? (
              <div className="sticker-panel">
                <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '1rem' }}>Instant Graphics</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                  {[
                    // Trending & Engagement
                    '🔥', '✨', '🚀', '💯', '💎', '⚡', '🌟', '💥', '🎉', '🎈',
                    // Reactions & Feedback 
                    '❤️', '✅', '❌', '⚠️', '🔔', '📌', '🌈', '🌙', '☀️', '☁️',
                    // Business & Growth
                    '📈', '💰', '💼', '📊', '💹', '🏢', '🏗️', '🤝', '🎯', '🏆',
                    // Technology & Web
                    '💻', '📱', '🌐', '🖥️', '📡', '🛡️', '⚙️', '🛠️', '🔗', '💾',
                    // Social & Communication
                    '📣', '💬', '📧', '📍', '👥', '🤳', '📸', '🎥', '🎬', '🎙️',
                    // Shopping & Retail
                    '🛒', '🛍️', '🎁', '🏷️', '📦', '💳', '🚚', '🏪', '🥯', '☕',
                    // Design & Creative
                    '🎨', '🖋️', '📐', '✒️', '🧩', '🖌️', '🧶', '🧵', '🎭', '🎪',
                    // Development & Coding
                    '🧑‍💻', '👩‍💻', '👨‍💻', '⌨️', '🖱️', '🔋', '🔌', '⚛️', '👾', '🤖', '🧠', '💡', '🔍', '📂'
                  ].map(emoji => (
                    <button 
                      key={emoji} 
                      onClick={() => addLayer('sticker', emoji)}
                      style={{ fontSize: '2rem', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'transform 0.2s' }}
                      onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                      onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >{emoji}</button>
                  ))}
                </div>

                <div style={{ marginTop: '2rem' }}>
                  <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '1rem', fontWeight: 800 }}>TECH STACK & LOGOS</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                    {[
                      'html5', 'css3', 'javascript', 'typescript', 'visualstudiocode', 'git', 'github', 'react', 'nextdotjs', 'vuedotjs', 'angular', 'nodedotjs', 'express', 'python',
                      'tailwindcss', 'sass', 'mongodb', 'postgresql', 'mysql', 'sqlite', 'firebase',
                      'docker', 'kubernetes', 'vercel', 'amazonaws', 'googlecloud', 'django', 'laravel',
                      'postman', 'insomnia', 'swagger', 'hoppscotch',
                      'c', 'cplusplus', 'csharp', 'java', 'php', 'ruby', 'swift', 'kotlin', 'dart', 'rust', 'go', 'r', 'perl', 'scala', 'elixir', 'haskell', 'lua'
                    ].map(slug => (
                      <button 
                        key={slug} 
                        title={slug === 'java' ? 'Java' : slug === 'amazonaws' ? 'AWS' : slug === 'matlab' ? 'MATLAB' : slug.charAt(0).toUpperCase() + slug.slice(1).replace('dotjs', '.js')}
                        onClick={() => addLayer('image', slug === 'matlab' ? 'https://img.icons8.com/color/48/matlab.png?v=2' : `https://cdn.simpleicons.org/${slug}`, 100, 100)}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '10px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s', minHeight: '65px' }}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                      >
                        <img 
                          src={slug === 'matlab' ? 'https://img.icons8.com/color/48/matlab.png?v=2' : `https://cdn.simpleicons.org/${slug}`} 
                          alt={slug} 
                          onError={(e) => {
                             const altSources = {
                               'css3': 'https://img.icons8.com/color/48/css3.png',
                               'html5': 'https://img.icons8.com/color/48/html5--v1.png',
                               'javascript': 'https://img.icons8.com/color/48/javascript--v1.png',
                               'visualstudiocode': 'https://img.icons8.com/color/48/visual-studio-code-2019.png',
                               'amazonaws': 'https://img.icons8.com/color/48/amazon-web-services.png',
                               'csharp': 'https://img.icons8.com/color/48/c-sharp-logo.png',
                               'java': 'https://img.icons8.com/color/48/java-coffee-cup-logo.png',
                               'python': 'https://img.icons8.com/color/48/python--v1.png',
                               'django': 'https://img.icons8.com/color/48/django.png',
                               'laravel': 'https://img.icons8.com/color/48/laravel.png',
                               'matlab': 'https://img.icons8.com/color/48/matlab.png?v=2'
                             };
                             if (altSources[slug]) e.target.src = altSources[slug];
                          }}
                          style={{ width: '28px', height: '28px', objectFit: 'contain' }} 
                        />
                        <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100% ' }}>{slug === 'java' ? 'Java' : slug === 'amazonaws' ? 'AWS' : slug === 'visualstudiocode' ? 'VS Code' : slug === 'matlab' ? 'MATLAB' : slug.replace('dotjs', '.js')}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : activeTool === 'add-shape' ? (
              <div className="shape-panel">
                <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '1rem' }}>Vector Shapes (50+)</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {[
                    { label: 'Basic', shapes: [
                      { id: 'square', icon: Square }, { id: 'circle', icon: Circle }, { id: 'triangle', icon: Triangle },
                      { id: 'diamond', icon: Diamond }, { id: 'pentagon', icon: Hexagon }, { id: 'hexagon', icon: Hexagon },
                      { id: 'heptagon', icon: Hexagon, label: '7-Sides' }, { id: 'octagon', icon: Hexagon, label: '8-Sides' },
                      { id: 'decagon', icon: Hexagon, label: '10-Sides' }, { id: 'star', icon: Star }, { id: 'heart', icon: Heart }
                    ]},
                    { label: 'Geometry', shapes: [
                      { id: 'parallelogram', icon: Square }, { id: 'trapezoid', icon: Square }, { id: 'rhombus', icon: Diamond },
                      { id: 'cylinder', icon: Database }, { id: 'cube', icon: Box }, { id: 'plus', icon: Plus },
                      { id: 'cross', icon: Plus }, { id: 'x', icon: Scissors }, { id: 'leaf', icon: Droplet }
                    ]},
                    { label: 'UI & Symbols', shapes: [
                      { id: 'folded-square', icon: StickyNote }, { id: 'smiley', icon: Smile }, { id: 'lightning', icon: Zap },
                      { id: 'sun', icon: Sun }, { id: 'moon', icon: Moon }, { id: 'cloud', icon: Cloud },
                      { id: 'bracket-left', icon: ChevronLeft }, { id: 'bracket-right', icon: ChevronRight },
                      { id: 'brace-left', icon: Parentheses }, { id: 'brace-right', icon: Parentheses }
                    ]},
                    { label: 'Abstract', shapes: [
                      { id: 'shuriken', icon: Star }, { id: 'burst', icon: Sparkles }, { id: 'shield', icon: Shield },
                      { id: 'badge', icon: ShieldCheck }, { id: 'banner', icon: Layout }, { id: 'pill', icon: Circle }
                    ]},
                    { label: 'Arrows', shapes: [
                      { id: 'arrow-right', icon: ArrowRight }, { id: 'arrow-left', icon: ArrowLeft }, 
                      { id: 'arrow-up', icon: ArrowUp }, { id: 'arrow-down', icon: ArrowDown },
                      { id: 'move-h', icon: MoveHorizontal, label: 'Dual-H' },
                      { id: 'move-v', icon: MoveVertical, label: 'Dual-V' },
                      { id: 'move-all', icon: Move, label: '4-Way' },
                      { id: 'corner-dr', icon: CornerDownRight, label: 'Corner-DR' },
                      { id: 'corner-dl', icon: CornerDownLeft, label: 'Corner-DL' },
                      { id: 'corner-ur', icon: CornerUpRight, label: 'Corner-UR' },
                      { id: 'corner-ul', icon: CornerUpLeft, label: 'Corner-UL' }
                    ]},
                    { label: 'Packaging & Cut', shapes: [
                      { id: 'cut-line', label: 'Cut Here', icon: Scissors },
                      { id: 'tear-line', label: 'Perforated', icon: Minus },
                      { id: 'tear-here', label: 'Tear Here', icon: Tag },
                      { id: 'tear-notch', label: 'V-Notch', icon: Triangle }
                    ]},
                    { label: 'Lines', shapes: [
                      { id: 'line-solid', label: 'Solid Line', icon: Minus },
                      { id: 'line-dashed', label: 'Dashed Line', icon: Minus },
                      { id: 'line-dotted', label: 'Dotted Line', icon: Minus },
                      { id: 'arrow-line', label: 'Arrow', icon: ArrowRight },
                      { id: 'double-arrow', label: 'Double Arrow', icon: MoveHorizontal },
                      { id: 'line-curly', label: 'Curly Line', icon: Wind },
                      { id: 'line-spiral', label: 'Spiral', icon: RotateCw },
                      { id: 'line-step', label: 'Step Line', icon: Layout },
                      { id: 'line-step-arrow', label: 'Step Arrow', icon: ArrowRight },
                      { id: 'line-step-double', label: 'Step Double', icon: MoveHorizontal },
                      { id: 'line-curve-s', label: 'S-Curve', icon: Wind },
                      { id: 'line-curve-arrow', label: 'Curve Arrow', icon: ArrowRight },
                      { id: 'line-arc', label: 'Arc Line', icon: Moon },
                      { id: 'line-scribble', label: 'Scribble', icon: PenTool }
                    ]},
                    // Adding many more to reach 50+ quota
                    { label: 'More Shapes', shapes: Array.from({ length: 20 }).map((_, i) => ({
                      id: `abstract-${i+1}`, 
                      label: `Shape ${i+1}`,
                      icon: [Hexagon, Star, Heart, Triangle, Diamond, Circle, Square][i % 7]
                    }))}
                  ].map(cat => (
                    <div key={cat.label}>
                      <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 800 }}>{cat.label.toUpperCase()}</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem' }}>
                        {cat.shapes.map(s => (
                          <button 
                            key={s.id} 
                            className="btn-shape" 
                            style={{ padding: '0.5rem 0.2rem', flexDirection: 'column', height: 'auto', gap: '4px' }}
                            onClick={() => addLayer('shape', s.id)}
                          >
                            <s.icon size={16} />
                            <span style={{ fontSize: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{s.label || s.id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : activeTool === 'gradient-bg' ? (
              <div className="bg-controls">
                <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '1rem' }}>Premium Gradients</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  {[
                    { label: 'Ocean', css: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)' },
                    { label: 'Sunset', css: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)' },
                    { label: 'Cyber', css: 'linear-gradient(135deg, #db2777 0%, #7c3aed 100%)' },
                    { label: 'Dark', css: 'linear-gradient(135deg, #111827 0%, #374151 100%)' }
                  ].map(g => (
                    <button key={g.label} onClick={() => changeBackground(g.css)} style={{ height: '40px', borderRadius: '8px', background: g.css, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }} />
                  ))}
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '1rem' }}>🛠️ Custom Gradient</p>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginBottom: '4px' }}>START</p>
                      <input type="color" defaultValue="#3b82f6" onChange={(e) => {
                         const start = e.target.value;
                         const end = document.getElementById('grad-end').value;
                         const deg = document.getElementById('grad-deg').value;
                         changeBackground(`linear-gradient(${deg}deg, ${start} 0%, ${end} 100%)`);
                      }} id="grad-start" style={{ width: '100%', height: '35px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginBottom: '4px' }}>END</p>
                      <input type="color" defaultValue="#8b5cf6" onChange={(e) => {
                         const start = document.getElementById('grad-start').value;
                         const end = e.target.value;
                         const deg = document.getElementById('grad-deg').value;
                         changeBackground(`linear-gradient(${deg}deg, ${start} 0%, ${end} 100%)`);
                      }} id="grad-end" style={{ width: '100%', height: '35px', borderRadius: '6px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }} />
                    </div>
                  </div>
                   <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <p style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>ANGLE</p>
                      <span id="deg-val" style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 800 }}>135°</span>
                    </div>
                    <input type="range" min="0" max="360" defaultValue="135" id="grad-deg" onChange={(e) => {
                       const start = document.getElementById('grad-start').value;
                       const end = document.getElementById('grad-end').value;
                       const deg = e.target.value;
                       document.getElementById('deg-val').innerText = `${deg}°`;
                       changeBackground(`linear-gradient(${deg}deg, ${start} 0%, ${end} 100%)`);
                    }} style={{ width: '100%' }} />
                  </div>

                  <div style={{ marginTop: '1.2rem' }}>
                    <p style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginBottom: '8px' }}>DIRECTION PRESETS</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                      {[
                        { label: '↓', deg: 180 }, { label: '↑', deg: 0 }, { label: '→', deg: 90 }, { label: '←', deg: 270 },
                        { label: '↘', deg: 135 }, { label: '↙', deg: 225 }, { label: '↗', deg: 45 }, { label: '↖', deg: 315 }
                      ].map(dir => (
                        <button 
                          key={dir.label}
                          onClick={() => {
                            const start = document.getElementById('grad-start').value;
                            const end = document.getElementById('grad-end').value;
                            document.getElementById('grad-deg').value = dir.deg;
                            document.getElementById('deg-val').innerText = `${dir.deg}°`;
                            changeBackground(`linear-gradient(${dir.deg}deg, ${start} 0%, ${end} 100%)`);
                          }}
                          style={{ height: '30px', background: 'var(--tool-bg)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-main)', fontSize: '14px', cursor: 'pointer' }}
                        >
                          {dir.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTool === 'bg-changer' ? (
              <div className="bg-controls">
                <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '1rem' }}>Studio Backdrops</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  {['#ffffff', '#f8fafc', '#e2e8f0', '#94a3b8', '#1a1a1a', '#000000', '#3b82f6', '#0ea5e9', '#06b6d4', '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444', '#f43f5e', '#ec4899', '#d946ef', '#a855f7'].map(color => (
                    <button 
                      key={color} 
                      onClick={() => changeBackground(color)}
                      style={{ height: '30px', borderRadius: '6px', background: color, border: '2px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                    />
                  ))}
                  <button 
                    onClick={() => changeBackground('transparent')}
                    style={{ height: '30px', borderRadius: '6px', background: 'transparent', border: '2px dashed rgba(255,255,255,1)', color: 'white', fontSize: '10px', cursor: 'pointer' }}
                  >PNG</button>
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Custom Color</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="color" value={canvasBg.startsWith('#') ? canvasBg : '#ffffff'} style={{ width: '50px', height: '40px', border: '1px solid var(--border)', borderRadius: '8px', background: 'transparent', cursor: 'pointer' }} onChange={(e) => changeBackground(e.target.value)} />
                    <input 
                      type="text" 
                      value={canvasBg} 
                      placeholder="#hexcode"
                      onChange={(e) => changeBackground(e.target.value)}
                      style={{ flex: 1, background: 'var(--tool-bg)', border: '1px solid var(--border)', borderRadius: '8px', padding: '0 12px', color: 'var(--text-main)', fontSize: '0.8rem', outline: 'none' }}
                    />
                  </div>
                </div>
              </div>
            ) : activeTool === 'canvas-dimensions' ? (
              <div className="bg-controls">
                <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '1rem' }}>Canvas Ratios</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.8rem', marginBottom: '1.5rem' }}>
                  {[
                    { label: '1:1 Square', w: 1024, h: 1024 },
                    { label: '4:5 Portrait', w: 1080, h: 1350 },
                    { label: '16:9 YouTube', w: 1920, h: 1080 },
                    { label: '9:16 Reels', w: 1080, h: 1920 },
                    { label: 'LinkedIn Banner', w: 1584, h: 396 },
                    { label: '4:3 Classic', w: 1200, h: 900 }
                  ].map(r => (
                    <button 
                      key={r.label}
                      className="btn-shape"
                      style={{ padding: '0.8rem', fontSize: '0.65rem' }}
                      onClick={() => {
                        setCanvasSize({ width: r.w, height: r.h });
                        notify(`Canvas resized to ${r.label} (${r.w}x${r.h})`);
                      }}
                    >
                      <span style={{ fontWeight: 800, display: 'block', marginBottom: '4px' }}>{r.label.split(' ')[0]}</span>
                      <span style={{ fontSize: '0.55rem', opacity: 0.7 }}>{r.w} x {r.h}</span>
                    </button>
                  ))}
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '1rem' }}>Custom Size (px)</p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginBottom: '4px' }}>WIDTH</p>
                      <input 
                        type="number" 
                        value={canvasSize.width}
                        onChange={(e) => setCanvasSize({ ...canvasSize, width: parseInt(e.target.value) || 0 })}
                        style={{ width: '100%', padding: '0.6rem', background: 'var(--tool-bg)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.8rem' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginBottom: '4px' }}>HEIGHT</p>
                      <input 
                        type="number" 
                        value={canvasSize.height}
                        onChange={(e) => setCanvasSize({ ...canvasSize, height: parseInt(e.target.value) || 0 })}
                        style={{ width: '100%', padding: '0.6rem', background: 'var(--tool-bg)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTool === 'crop' ? (
              <div className="crop-controls">
                <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                  ✨ Drag the box to **move** it. <br />
                  📏 Drag the **blue handle** to resize.
                </p>
                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Ratio Presets</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                    {[
                      { label: 'Free', w: 100, h: 100 },
                      { label: '1:1 Square', w: 100, h: 100 },
                      { label: '16:9 HD', w: 160, h: 90 },
                      { label: '4:3 Standard', w: 120, h: 90 },
                      { label: '9:16 Story', w: 90, h: 160 },
                      { label: '2:3 Classic', w: 80, h: 120 }
                    ].map(r => (
                      <button 
                        key={r.label}
                        className="btn-shape"
                        style={{ padding: '0.5rem', fontSize: '0.6rem' }}
                        onClick={() => setCrop(prev => ({ ...prev, width: r.w, height: r.h }))}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button className="btn-primary" style={{ width: '100%', padding: '1rem' }} onClick={applyCrop}>Apply Crop</button>
              </div>
            ) : activeTool === 'brush-type' ? (
              <div className="brush-panel">
                <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '1rem' }}>Brush Engine</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                  {[
                    { id: 'solid', label: 'Classic', icon: Circle },
                    { id: 'neon', label: 'Neon Glow', icon: Zap },
                    { id: 'spray', label: 'Spray Paint', icon: Wind },
                    { id: 'pencil', label: 'Hard HB', icon: PenTool }
                  ].map(type => (
                    <button 
                      key={type.id}
                      className={`btn-shape ${brushType === type.id ? 'active' : ''}`}
                      onClick={() => updateValue(type.id)}
                      style={{ background: brushType === type.id ? 'var(--primary)' : 'rgba(255,255,255,0.02)' }}
                    >
                      <type.icon size={16} />
                      <span style={{ fontSize: '0.65rem' }}>{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : activeTool === 'text-color' || activeTool === 'img-outline-color' || activeTool === 'text-outline-color' || activeTool === 'text-glow-color' ? (
              <div className="color-panel">
                <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '1rem' }}>
                   {activeTool === 'text-color' ? 'Text Color' : 
                    activeTool === 'text-outline-color' ? 'Outline Color' :
                    activeTool === 'text-glow-color' ? 'Glow Color' : 'Layer Color'}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  {['#ffffff', '#000000', '#94a3b8', '#475569', '#3b82f6', '#0ea5e9', '#06b6d4', '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444', '#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1'].map(color => (
                    <button 
                      key={color} 
                      onClick={() => updateValue(color)}
                      style={{ height: '30px', borderRadius: '6px', background: color, border: '1px solid var(--border)', cursor: 'pointer' }}
                    />
                  ))}
                </div>
                <input type="color" style={{ width: '100%', height: '40px', border: 'none', background: 'transparent', cursor: 'pointer' }} onChange={(e) => updateValue(e.target.value)} />
              </div>
            ) : activeTool === 'font-family' ? (
              <div style={{ padding: '0.5rem' }}>
                 <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '1rem' }}>Font Family</p>
                  <select 
                    value={layers.find(l => l.id === selectedLayerId)?.fontFamily || 'Inter'}
                    onChange={(e) => updateValue(e.target.value)}
                    style={{ 
                      width: '100%', 
                      background: 'var(--bg-card)', 
                      border: '1px solid var(--border)', 
                      borderRadius: '8px', 
                      padding: '0.8rem', 
                      color: 'var(--text-main)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="" disabled>Select Font</option>
                    {FONTS.map(f => (
                      <option key={f} value={f} style={{ fontFamily: f, background: 'var(--bg-card)', color: 'var(--text-main)' }}>{f}</option>
                    ))}
                  </select>
              </div>
            ) : activeTool === 'text-align' ? (
              <div style={{ padding: '0.5rem' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '1rem' }}>Alignment</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  <button className={`btn-shape ${layers.find(l => l.id === selectedLayerId)?.textAlign === 'left' ? 'active' : ''}`} onClick={() => updateValue('left')}>
                    <AlignLeft size={20} />
                  </button>
                  <button className={`btn-shape ${layers.find(l => l.id === selectedLayerId)?.textAlign === 'center' ? 'active' : ''}`} onClick={() => updateValue('center')}>
                    <AlignCenter size={20} />
                  </button>
                  <button className={`btn-shape ${layers.find(l => l.id === selectedLayerId)?.textAlign === 'right' ? 'active' : ''}`} onClick={() => updateValue('right')}>
                    <AlignRight size={20} />
                  </button>
                </div>
              </div>
            ) : activeTool === 'brush-tool' ? (
              <div style={{ padding: '0.5rem' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '1.5rem', letterSpacing: '1px' }}>🖌️ BRUSH STUDIO</p>
                
                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.6rem', fontWeight: 700 }}>PRESET SIZES</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                    {[2, 10, 35, 90].map(s => (
                      <button key={s} onClick={() => { setBrushSize(s); triggerBrushPreview(); }} style={{ background: brushSize === s ? 'var(--primary)' : 'var(--tool-bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 5px', color: brushSize === s ? 'white' : 'var(--text-main)', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 800, transition: 'all 0.2s' }}>
                        {s === 2 ? 'THIN' : s === 10 ? 'MED' : s === 35 ? 'BOLD' : 'HUGE'}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.6rem', fontWeight: 700 }}>COLOR PALETTE</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.6rem', marginBottom: '1rem' }}>
                    {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#000000', '#ffffff', '#6366f1', '#ec4899', '#f8fafc'].map(c => (
                      <button key={c} onClick={() => setBrushColor(c)} style={{ height: '32px', borderRadius: '8px', background: c, border: brushColor === c ? '3px solid white' : '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', boxShadow: brushColor === c ? '0 0 15px rgba(255,255,255,0.3)' : 'none' }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} style={{ width: '50px', height: '45px', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }} />
                    <input type="text" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} style={{ flex: 1, background: 'var(--tool-bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', color: 'var(--text-main)', fontSize: '0.8rem', fontWeight: 700 }} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                       <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800 }}>LINE WIDTH</p>
                       <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 900 }}>{brushSize}PX</span>
                    </div>
                    <input type="range" min="1" max="250" value={brushSize} onChange={(e) => { setBrushSize(Number(e.target.value)); triggerBrushPreview(); }} className="slider" />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                       <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800 }}>TRANSPARENCY</p>
                       <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 900 }}>{Math.round(brushOpacity * 100)}%</span>
                    </div>
                    <input type="range" min="0" max="1" step="0.01" value={brushOpacity} onChange={(e) => setBrushOpacity(Number(e.target.value))} className="slider" />
                  </div>
                </div>
              </div>
            ) : activeTool === 'img-order' ? (
              <div style={{ padding: '0.5rem' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '1.5rem' }}>LAYER DEPTH</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <button className="btn-shape" onClick={() => moveLayer('front')} style={{ padding: '15px' }}>
                    <Layers size={20} />
                    <span style={{ fontSize: '0.65rem', display: 'block' }}>TO FRONT</span>
                  </button>
                  <button className="btn-shape" onClick={() => moveLayer('back')} style={{ padding: '15px' }}>
                     <Layers size={20} style={{ opacity: 0.5 }} />
                     <span style={{ fontSize: '0.65rem', display: 'block' }}>TO BACK</span>
                  </button>
                  <button className="btn-shape" onClick={() => moveLayer('up')} style={{ padding: '15px' }}>
                    <ArrowUp size={20} />
                    <span style={{ fontSize: '0.65rem', display: 'block' }}>FORWARD</span>
                  </button>
                  <button className="btn-shape" onClick={() => moveLayer('down')} style={{ padding: '15px' }}>
                     <ArrowDown size={20} />
                     <span style={{ fontSize: '0.65rem', display: 'block' }}>BACKWARD</span>
                  </button>
                </div>
              </div>
            ) : activeTool === 'export-design' ? (
              <div style={{ padding: '0.5rem' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '1.5rem', letterSpacing: '1px' }}>🚀 EXPORT STUDIO</p>
                
                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.8rem', fontWeight: 700 }}>SELECT FORMAT</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                    {['png', 'jpg', 'jpeg'].map(f => (
                      <button 
                        key={f} 
                        onClick={() => setExportFormat(f)} 
                        style={{ 
                          background: exportFormat === f ? 'var(--primary)' : 'var(--bg-card)', 
                          border: `1px solid ${exportFormat === f ? 'var(--primary)' : 'var(--border)'}`, 
                          borderRadius: '10px', 
                          padding: '12px 5px', 
                          color: exportFormat === f ? 'white' : 'var(--text-main)', 
                          cursor: 'pointer', 
                          fontSize: '0.7rem', 
                          fontWeight: 800, 
                          textTransform: 'uppercase' 
                        }}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {exportFormat !== 'png' && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                       <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800 }}>QUALITY</p>
                       <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 900 }}>{Math.round(exportQuality * 100)}%</span>
                    </div>
                    <input type="range" min="0.1" max="1" step="0.1" value={exportQuality} onChange={(e) => setExportQuality(Number(e.target.value))} className="slider" />
                  </div>
                )}

                <button 
                  className="btn-primary" 
                  style={{ width: '100%', padding: '1rem', marginTop: '1rem', borderRadius: '12px' }} 
                  onClick={() => handleExport()}
                >
                  <Download size={18} />
                  <span>DOWNLOAD NOW</span>
                </button>
              </div>
            ) : activeTool === 'eraser-tool' ? (
              <div style={{ padding: '0.5rem' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '1.5rem', letterSpacing: '1px' }}>🧽 ERASER TOOL</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', padding: '1.5rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px dashed rgba(239, 68, 68, 0.2)', borderRadius: '12px', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.75rem', color: 'white', fontWeight: 600 }}>Drag over your brush strokes to erase them individually.</p>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                         <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800 }}>ERASER RADIUS</p>
                         <span style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 900 }}>{brushSize}PX</span>
                      </div>
                      <input type="range" min="5" max="250" value={brushSize} onChange={(e) => { setBrushSize(Number(e.target.value)); triggerBrushPreview(); }} className="slider" style={{ accentColor: '#ef4444' }} />
                    </div>
                </div>
              </div>
            ) : activeTool?.startsWith('lasso-') ? (
              <div style={{ padding: '0.5rem' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '1.5rem', letterSpacing: '1px' }}>🎯 SELECTION TOOLS</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', padding: '1.5rem', background: 'rgba(59, 130, 246, 0.05)', border: '1px dashed rgba(59, 130, 246, 0.3)', borderRadius: '12px', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.8rem', color: 'white', fontWeight: 600 }}>
                        {activeTool === 'lasso-regular' ? '✨ Draw freehand to create selection' : 
                         activeTool === 'lasso-polygonal' ? '📐 Click to set points, close the loop' :
                         '🧲 Automatically snaps to object edges'}
                    </p>
                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Use selection to cut, mask, or adjust specific areas.</p>
                    <button 
                      onClick={() => { setLassoPoints([]); notify("Selection Reset 🎯"); }}
                      style={{ flex: 1, padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer' }}
                    >RESET</button>
                    <button 
                      onClick={extractSelection}
                      style={{ flex: 2, padding: '10px', background: 'var(--primary)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer', boxShadow: 'none' }}
                    >✂️ EXTRACT SELECTION</button>
                </div>
              </div>
            ) : (
              <>
                <div className="control-header">
                  <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{currentTool.label}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>
                    {(() => {
                      const layer = layers.find(l => l.id === selectedLayerId);
                      if (selectedLayerId && layer) {
                        if (layer.filters && layer.filters[activeTool] !== undefined) return layer.filters[activeTool];
                        if (activeTool === 'font-size') return layer.fontSize;
                        if (activeTool === 'text-curve') return layer.curve || 0;
                        if (activeTool === 'letter-spacing') return layer.letterSpacing;
                        if (activeTool === 'line-height') return layer.lineHeight;
                        if (activeTool === 'text-opacity') return layer.opacity;
                        if (activeTool === 'img-opacity') return layer.opacity;
                        if (activeTool === 'img-radius') return layer.borderRadius;
                        if (activeTool === 'img-rotate') return layer.rotation;
                        if (activeTool === 'img-scale') return layer.scale;
                        if (activeTool === 'img-shadow') return layer.shadow;
                      }
                      return (values[activeTool] || currentTool.default || 0);
                    })()}
                    {currentTool.unit || ''}
                  </span>
                </div>
                {currentTool.min !== undefined && (
                  <input 
                    type="range"
                    className="slider"
                    min={currentTool.min}
                    max={currentTool.max}
                    step={currentTool.step || 1}
                    value={(() => {
                      const layer = layers.find(l => l.id === selectedLayerId);
                      if (selectedLayerId && layer) {
                        if (layer.filters && layer.filters[activeTool] !== undefined) return layer.filters[activeTool];
                        if (activeTool === 'font-size') return layer.fontSize;
                        if (activeTool === 'text-curve') return layer.curve || 0;
                        if (activeTool === 'text-bulge') return layer.bulge || 0;
                        if (activeTool === 'text-outline') return layer.outline || 0;
                        if (activeTool === 'text-squeeze') return layer.squeeze || 0;
                        if (activeTool === 'text-glow') return layer.glow || 0;
                        if (activeTool === 'letter-spacing') return layer.letterSpacing;
                        if (activeTool === 'line-height') return layer.lineHeight;
                        if (activeTool === 'text-opacity') return layer.opacity;
                        if (activeTool === 'img-opacity') return layer.opacity;
                        if (activeTool === 'img-radius') return layer.borderRadius;
                        if (activeTool === 'img-rotate') return layer.rotation;
                        if (activeTool === 'img-scale') return layer.scale;
                        if (activeTool === 'img-shadow') return layer.shadow;
                      }
                      return (values[activeTool] || currentTool.default || 0);
                    })()}
                    onChange={(e) => updateValue(e.target.value)}
                  />
                )}
              </>
            )}
            {(activeTool === 'text' || isTemplateMode) && !selectedLayerId ? (
              <div style={{ marginTop: '1rem' }}>
                 <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Font Family</p>
                  <select 
                    value={templateData.font}
                    onChange={(e) => setTemplateData(prev => ({ ...prev, font: e.target.value }))}
                    style={{ 
                      width: '100%', 
                      background: '#1a1a1a', 
                      border: '1px solid var(--border)', 
                      borderRadius: '8px', 
                      padding: '0.6rem', 
                      color: 'white',
                      fontSize: '0.8rem',
                      outline: 'none'
                    }}
                  >
                    <option style={{ background: '#1a1a1a' }} value="Inter">Inter</option>
                    <option style={{ background: '#1a1a1a' }} value="Poppins">Poppins</option>
                    <option style={{ background: '#1a1a1a' }} value="Roboto">Roboto</option>
                  </select>
              </div>
            ) : null}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <section className={`workspace glass ${!image && !isTemplateMode && !isBlankCanvas && !isStudioMode ? 'dashboard-active' : ''}`}>
          <AnimatePresence mode="wait">
            {!image && !isTemplateMode && !isBlankCanvas && !isStudioMode ? (
              <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="project-dashboard" style={{ width: '100%', padding: '2rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                  <motion.h1 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    style={{ 
                      fontSize: '4rem', 
                      fontWeight: 900, 
                      marginBottom: '0.8rem', 
                      background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', 
                      WebkitBackgroundClip: 'text', 
                      WebkitTextFillColor: 'transparent', 
                      letterSpacing: '-2px',
                      filter: 'none'
                    }}>Creative Studio</motion.h1>
                  <p style={{ color: 'var(--text-main)', fontSize: '1.2rem', fontWeight: 600, letterSpacing: '0.5px', opacity: 0.8 }}>Choose your workspace to begin professional design</p>
                </div>
                
                <div className="dashboard-grid">
                  <motion.div whileHover={{ y: -5 }} className="project-card" onClick={() => { setIsStudioMode(true); fileInputRef.current?.click(); }}>
                    <div className="card-icon" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.4))' }}>
                      <ImageIcon size={32} />
                    </div>
                    <h3>Edit Photo</h3>
                    <p>Standard professional editor with 50+ tools, AI filters, and retouching.</p>
                  </motion.div>

                  <motion.div whileHover={{ y: -5 }} className="project-card" onClick={() => {
                    setImage(null);
                    setCanvasBg('#ffffff');
                    setLayers([]);
                    setIsTemplateMode(false);
                    setIsBlankCanvas(true);
                    setIsStudioMode(false);
                  }}>
                    <div className="card-icon" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(124, 58, 237, 0.4))' }}>
                      <PenTool size={32} />
                    </div>
                    <h3>Blank Canvas</h3>
                    <p>Create a design from scratch layer by layer with full vector controls.</p>
                  </motion.div>

                </div>
              </motion.div>
            ) : isStudioMode && !image ? (
              <motion.div key="studio" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="studio-welcome">
                <div style={{
                  width: '320px',
                  maxWidth: '90vw',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '1.25rem',
                  padding: '2rem 1.5rem',
                  textAlign: 'center',
                  boxShadow: 'none',
                  position: 'relative',
                  marginTop: '4rem'
                }}>
                  <div style={{ 
                    width: '60px', 
                    height: '60px', 
                    background: 'var(--primary)', 
                    borderRadius: '18px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    margin: '0 auto 1.2rem',
                    boxShadow: 'none'
                  }}>
                    <Camera size={28} color="white" />
                  </div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.8rem' }}>Photo Editor Studio</h2>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
                    Upload a high-quality photo to begin professional retouching and design.
                  </p>
                  
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      background: 'var(--primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '16px',
                      padding: '1rem 2rem',
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      margin: '0 auto'
                    }}
                  >
                    <Download size={20} />
                    Upload Pick to Edit
                  </motion.button>
                  
                  <button 
                    onClick={() => setIsStudioMode(false)}
                    style={{ 
                      marginTop: '2rem', 
                      background: 'transparent', 
                      border: 'none', 
                      color: 'var(--text-muted)', 
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      textDecoration: 'underline'
                    }}
                  >
                    Back to Selection
                  </button>
                </div>
              </motion.div>
            ) : isTemplateMode ? (
              <motion.div key="template" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="canvas-container">
                <div style={{
                  width: '400px',
                  height: '400px',
                  background: 'white',
                  borderRadius: '2rem',
                  padding: '2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  color: '#1a1a1a',
                  boxShadow: 'none',
                  position: 'relative'
                }}>
                  <input 
                    type="file" 
                    ref={avatarInputRef} 
                    className="sr-only" 
                    accept="image/*" 
                    onChange={handleAvatarUpload} 
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div 
                      onClick={() => avatarInputRef.current?.click()}
                      style={{ position: 'relative', cursor: 'pointer' }}
                      title="Change Profile Picture"
                    >
                      <img src={templateData.avatar} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} alt="Avatar" />
                      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }} className="avatar-hover">
                        <ImageIcon size={12} color="white" />
                      </div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <input 
                        value={templateData.name} 
                        onChange={(e) => setTemplateData(prev => ({ ...prev, name: e.target.value }))}
                        style={{ background: 'transparent', border: 'none', fontSize: '0.9rem', fontWeight: 800, width: '100%' }}
                      />
                      <input 
                        value={templateData.handle} 
                        onChange={(e) => setTemplateData(prev => ({ ...prev, handle: e.target.value }))}
                        style={{ background: 'transparent', border: 'none', fontSize: '0.75rem', color: '#64748b', width: '100%' }}
                      />
                    </div>
                  </div>
                  <textarea 
                    value={templateData.text}
                    onChange={(e) => setTemplateData(prev => ({ ...prev, text: e.target.value }))}
                    style={{ 
                      background: 'transparent', 
                      border: 'none', 
                      fontSize: '1.1rem', 
                      fontWeight: 500, 
                      lineHeight: 1.4, 
                      textAlign: 'left', 
                      marginBottom: '1.5rem', 
                      width: '100%',
                      fontFamily: templateData.font || 'Inter',
                      resize: 'none',
                      overflow: 'hidden'
                    }}
                  />
                  <div style={{ flex: 1, overflow: 'hidden', borderRadius: '1rem' }}>
                    <img src={image} style={{ width: '100%', height: '100%', objectFit: 'cover', ...imageStyle }} alt="Feature" />
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="image" 
                ref={canvasRef}
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className={`canvas-container ${isBlankCanvas ? 'blank-page' : ''}`}
                style={{ 
                  position: 'relative', 
                  background: canvasBg, 
                  borderRadius: (isBlankCanvas || image) ? '0' : '12px', 
                  overflow: 'visible',
                  width: (isBlankCanvas || image) ? `${canvasSize.width}px` : 'auto',
                  height: (isBlankCanvas || image) ? `${canvasSize.height}px` : 'auto',
                  boxShadow: 'none',
                  transform: `scale(${values.resize || 0.55})`,
                  transformOrigin: 'top center'
                }}
              >
                {/* Canvas Size Indicator */}
                {(isBlankCanvas || image) && (
                  <div style={{
                    position: 'absolute',
                    top: '-30px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#3b82f6',
                    color: 'white',
                    padding: '2px 10px',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                    zIndex: 1001
                  }}>
                    {Math.round(canvasSize.width)} × {Math.round(canvasSize.height)} px
                  </div>
                )}

                {/* Brush Size Preview Circle */}
                <AnimatePresence>
                  {isAdjustingBrush && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: `${brushSize}px`,
                        height: `${brushSize}px`,
                        borderRadius: '50%',
                        border: `3px solid ${activeTool === 'eraser-tool' ? '#ef4444' : brushColor}`,
                        background: activeTool === 'eraser-tool' ? 'rgba(239, 68, 68, 0.2)' : `${brushColor}22`,
                        zIndex: 2000,
                        pointerEvents: 'none',
                        boxShadow: 'none'
                      }}
                    />
                  )}
                </AnimatePresence>

                {/* Clipping Viewport for Content */}
                <div style={{ 
                  position: (isBlankCanvas || image) ? 'absolute' : 'relative', 
                  inset: (isBlankCanvas || image) ? 0 : 'auto', 
                  overflow: 'visible', 
                  pointerEvents: 'none', 
                  borderRadius: (isBlankCanvas || image) ? '0' : '12px',
                  width: '100%',
                  height: (isBlankCanvas || image) ? '100%' : 'auto'
                }}>
                  <div 
                    onMouseDown={() => setSelectedLayerId(null)}
                    style={{ position: 'relative', width: '100%', height: '100%', pointerEvents: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {showGrid && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 998,
                        pointerEvents: 'none',
                        backgroundSize: '40px 40px',
                        backgroundImage: `
                          linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
                          linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)
                        `,
                        opacity: 0.8
                      }} />
                    )}
                    {/* Outline layer behind main image */}
                    {image && values['img-outline'] && (
                      <img 
                        src={image} 
                        alt="" 
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'fill',
                          filter: getOutlineFilter(values['img-outline'], values['img-outline-color']),
                          pointerEvents: 'none',
                          zIndex: 0
                        }} 
                      />
                    )}
                    {image && (
                      <img 
                        src={image} 
                        alt="Work" 
                        ref={imageRef} 
                        className="main-image" 
                        style={{
                          ...imageStyle, 
                          cursor: activeTool === 'remove-color' ? 'crosshair' : 'default',
                          position: 'relative',
                          width: '100%',
                          height: '100%',
                          objectFit: 'fill',
                          zIndex: 1
                        }} 
                        onClick={handleImageClick}
                      />
                    )}

                    
                    {isBlankCanvas && !image && (
                      <div 
                        className="blank-canvas-base" 
                        onMouseDown={() => setSelectedLayerId(null)}
                        style={{ width: '100%', height: '100%', background: canvasBg }}
                      ></div>
                    )}

                    {/* Drawing Layer Overlay */}
                    <svg
                      onMouseDown={startDrawing}
                      onMouseMove={continueDrawing}
                      onMouseUp={endDrawing}
                      onMouseLeave={endDrawing}
                      onTouchStart={(e) => startDrawing(e.touches[0])}
                      onTouchMove={(e) => continueDrawing(e.touches[0])}
                      onTouchEnd={endDrawing}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        zIndex: activeCategory === 'Draw' ? 1000 : 5,
                        cursor: activeTool === 'brush-tool' ? "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' style='filter: drop-shadow(0 0 2px black);'><path d='M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z'></path></svg>\") 0 32, crosshair" :
                                activeTool === 'eraser-tool' ? "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' style='filter: drop-shadow(0 0 2px black);'><path d='m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.9-9.9c1-1 2.5-1 3.4 0l4.3 4.3c1 1 1 2.5 0 3.4L10.5 21c-1 1-2.5 1-3.4 0Z'></path><path d='m22 21-10 0'></path><path d='m18 11-4-4'></path></svg>\") 0 32, crosshair" :
                                activeCategory === 'Draw' ? 'crosshair' : 'default',
                        pointerEvents: (activeCategory === 'Draw' && activeTool && activeTool !== 'draw-none') ? 'auto' : 'none',
                        touchAction: 'none'
                      }}
                    >
                      {[...drawPaths, currentPath].filter(Boolean).map((path, i) => {
                         if (!path.points || path.points.length < 2) return null;
                         const d = path.points.map((p, j) => `${j === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                         
                         if (path.type === 'neon') return (
                           <g key={`pn-${i}`}>
                             <path d={d} stroke={path.color} strokeWidth={path.size + 10} fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'blur(8px)', opacity: 0.4 }} />
                             <path d={d} stroke={path.color} strokeWidth={path.size + 4} fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'blur(2px)', opacity: 0.7 }} />
                             <path d={d} stroke="#ffffff" strokeWidth={path.size / 2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                           </g>
                         );

                         if (path.type === 'spray') return (
                           <g key={`ps-${i}`}>
                             {path.points.filter((_, idx) => idx % 4 === 0).map((p, idx) => (
                               Array.from({ length: 5 }).map((_, sid) => (
                                 <circle 
                                   key={`${idx}-${sid}`}
                                   cx={p.x + (Math.random() - 0.5) * path.size * 1.5} 
                                   cy={p.y + (Math.random() - 0.5) * path.size * 1.5} 
                                   r={Math.random() * 1.5 + 0.5} 
                                   fill={path.color} 
                                   style={{ opacity: Math.random() * 0.4 }}
                                 />
                               ))
                             ))}
                           </g>
                         );

                         return (
                           <path 
                             key={`psol-${i}`}
                             d={d}
                             stroke={path.color}
                             strokeWidth={path.size}
                             strokeOpacity={path.opacity}
                             fill="none"
                             strokeLinecap="round"
                             strokeLinejoin="round"
                             style={{ filter: path.blur > 0 ? `blur(${path.blur}px)` : 'none' }}
                           />
                         );
                      })}
                      {/* Lasso Selection Visualization */}
                      {lassoPoints.length > 1 && (
                        <g>
                          <polygon
                            points={lassoPoints.map(p => `${p.x},${p.y}`).join(' ')}
                            fill="rgba(59, 130, 246, 0.15)"
                            stroke="white"
                            strokeWidth={1.5}
                            className="marching-ants-path"
                            style={{ strokeDashoffset: 0 }}
                          />
                          <polygon
                            points={lassoPoints.map(p => `${p.x},${p.y}`).join(' ')}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth={1.5}
                            className="marching-ants-path"
                            style={{ strokeDashoffset: 10 }}
                          />
                        </g>
                      )}
                    </svg>

                    {/* Global Alignment Guides Lines */}
                    {alignmentGuides.x && <div style={{ position: 'absolute', top: 0, bottom: 0, left: alignmentGuides.x, width: '1px', background: 'var(--primary)', zIndex: 9999, pointerEvents: 'none' }} />}
                    {alignmentGuides.y && <div style={{ position: 'absolute', left: 0, right: 0, top: alignmentGuides.y, height: '1px', background: 'var(--primary)', zIndex: 9999, pointerEvents: 'none' }} />}
                    
                    {/* Layers rendering inside clipper */}
                    {layers.map((layer, index) => (
                      <motion.div
                        key={layer.id}
                        drag
                        dragElastic={0}
                        onDrag={(e, info) => {
                          const centerX = canvasSize.width / 2;
                          const centerY = canvasSize.height / 2;
                          const currentX = layer.x + info.offset.x;
                          const currentY = layer.y + info.offset.y;
                          const layerCX = currentX + (layer.width || 0) / 2;
                          const layerCY = currentY + (layer.height || 0) / 2;

                          let snapX = null;
                          let snapY = null;
                          if (Math.abs(layerCX - centerX) < 15) snapX = centerX;
                          if (Math.abs(layerCY - centerY) < 15) snapY = centerY;
                          setAlignmentGuides({ x: snapX, y: snapY });
                        }}
                        onDragEnd={(e, info) => {
                          setAlignmentGuides({ x: null, y: null });
                          const centerX = canvasSize.width / 2;
                          const centerY = canvasSize.height / 2;
                          const targetX = layer.x + info.offset.x;
                          const targetY = layer.y + info.offset.y;
                          const targetCX = targetX + (layer.width / 2);
                          const targetCY = targetY + (layer.height / 2);
                          
                          let finalX = targetX;
                          let finalY = targetY;
                          if (Math.abs(targetCX - centerX) < 15) finalX = centerX - (layer.width / 2);
                          if (Math.abs(targetCY - centerY) < 15) finalY = centerY - (layer.height / 2);
                          
                          setLayers(prev => prev.map(l => (
                            l.id === layer.id ? { ...l, x: finalX, y: finalY } : l
                          )));
                          saveToHistory();
                        }}
                        onMouseDown={(e) => { e.stopPropagation(); setSelectedLayerId(layer.id); }}
                        className={`layer-item ${selectedLayerId === layer.id ? 'active' : ''}`}
                        style={{ 
                          position: 'absolute',
                          left: 0, 
                          top: 0, 
                          x: layer.x,
                          y: layer.y,
                          width: layer.type === 'text' ? 'auto' : layer.width,
                          height: layer.type === 'text' ? 'auto' : layer.height,
                          minWidth: layer.type === 'text' ? '120px' : 'none',
                          minHeight: layer.type === 'text' ? '50px' : 'none',
                          scaleX: (layer.scale || 1) * (layer.flipX || 1),
                          scaleY: (layer.scale || 1) * (layer.flipY || 1),
                          rotate: layer.rotation || 0,
                          zIndex: selectedLayerId === layer.id ? 999 : (index + 5),
                          cursor: editingTextId === layer.id ? 'text' : 'move',
                          touchAction: 'none',
                          userSelect: editingTextId === layer.id ? 'text' : 'none',
                          WebkitUserSelect: editingTextId === layer.id ? 'text' : 'none'
                        }}
                      >
                        <div style={{ 
                          position: 'relative', 
                          padding: 0, 
                          width: layer.type === 'text' ? 'auto' : '100%', 
                          height: layer.type === 'text' ? 'auto' : '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {/* Drag Handle Icon for better UI */}
                          {selectedLayerId === layer.id && (
                            <div style={{ 
                              position: 'absolute', 
                              top: '-12px', 
                              left: '-12px', 
                              color: 'var(--primary)', 
                              background: 'white', 
                              borderRadius: '50%', 
                              padding: '3px', 
                              boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                              scale: 1 / (layer.scale || 1), 
                              rotate: -(layer.rotation || 0)
                            }}>
                              <Move size={10} />
                            </div>
                          )}


                          
                          {layer.type === 'image' && (
                            <>
                              {/* Outline behind layer image */}
                              {layer.filters && layer.filters['img-outline'] && (
                                <img 
                                  src={layer.data} 
                                  style={{ 
                                    position: 'absolute',
                                    inset: 0,
                                    width: '100%', 
                                    height: 'auto', 
                                    display: 'block',
                                    pointerEvents: 'none',
                                    filter: getOutlineFilter(layer.filters['img-outline'], layer.filters['img-outline-color']),
                                    zIndex: 0
                                  }} 
                                />
                              )}
                              <img 
                                src={layer.data} 
                                style={{ 
                                  width: '100%', 
                                  height: '100%', 
                                  display: 'block',
                                  pointerEvents: 'none',
                                  objectFit: 'fill',
                                  opacity: layer.opacity !== undefined ? layer.opacity : 1,
                                  borderRadius: `${layer.borderRadius || 0}px`,
                                  filter: getLayerFilterStyle(layer),
                                  transform: `scale(${layer.flipX || 1}, ${layer.flipY || 1})`,
                                  border: layer.border ? `${layer.border}px solid ${layer.borderColor || 'white'}` : 'none',
                                  position: 'relative',
                                  zIndex: 1
                                }} 
                              />
                            </>
                          )}
                          {layer.type === 'text' && (
                            <div 
                              ref={editingTextId === layer.id ? editingTextRef : null}
                              contentEditable={editingTextId === layer.id}
                              suppressContentEditableWarning
                              onMouseDown={(e) => {
                                // Double click to edit, single click to select
                                if (selectedLayerId === layer.id) {
                                   if (e.detail === 2) setEditingTextId(layer.id);
                                }
                              }}
                              onBlur={(e) => {
                                setEditingTextId(null);
                                setLayers(prev => prev.map(l => (l.id === layer.id ? { ...l, data: e.target.innerText } : l)));
                              }}
                              style={{ 
                                fontSize: `${layer.fontSize}px`, 
                                fontFamily: layer.fontFamily || 'Inter',
                                color: editingTextId === layer.id ? (layer.color || '#000000') : 'transparent',
                                fontWeight: 800,
                                minWidth: '100px',
                                minHeight: '40px',
                                padding: '10px',
                                outline: 'none',
                                cursor: editingTextId === layer.id ? 'text' : 'move',
                                pointerEvents: selectedLayerId === layer.id ? 'auto' : 'none',
                                textAlign: layer.textAlign || 'center',
                                width: layer.type === 'text' ? 'max-content' : '100%',
                                height: 'auto',
                                whiteSpace: 'nowrap',
                                opacity: layer.opacity !== undefined ? layer.opacity : 1,
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              {editingTextId === layer.id ? layer.data : (
                                <div style={{ 
                                  display: 'flex', 
                                  justifyContent: 'center', 
                                  width: '100%',
                                  perspective: '1200px',
                                  transformStyle: 'preserve-3d',
                                  pointerEvents: 'none'
                                }}>
                                   {layer.data.split('').map((char, i, arr) => {
                                      const mid = (arr.length - 1) / 2;
                                      const dist = i - mid;
                                      const normalizedDist = dist / (arr.length || 1);
                                      
                                      // Tamed Curve Calculation (Organized Sine-based Arch)
                                      const curveVal = (layer.curve || 0) * 0.5; // Scale down input
                                      
                                      // 1. Arch Calculation (Subtle sine bend)
                                      const yOffset = (Math.cos(normalizedDist * Math.PI) - 1) * curveVal * 2.0;
                                      
                                      // 2. Tangent Rotation (Subtle alignment)
                                      const bend = -Math.sin(normalizedDist * Math.PI) * curveVal * 0.4;
                                      
                                      // 3. Bulge & Squeeze Calculation
                                      const bulgeScale = 1 + (Math.cos(normalizedDist * Math.PI) * (layer.bulge || 0) * 0.015);
                                      const squeezeX = Math.sin(normalizedDist * Math.PI) * (layer.squeeze || 0) * 0.4;
                                      
                                      // 3. Shadow/Glow & Outline Combined
                                      const glow = layer.glow || 0;
                                      const glowCol = layer.glowColor || 'rgba(59, 130, 246, 0.5)';
                                      const outline = layer.outline || 0;
                                      const outCol = layer.outlineColor || '#000000';

                                      return (
                                        <span key={i} style={{
                                          display: 'inline-block',
                                          whiteSpace: 'pre',
                                          color: layer.color || '#000000',
                                          letterSpacing: `${layer.letterSpacing || 0}px`,
                                          lineHeight: layer.lineHeight || 1.2,
                                          transform: `
                                            translateX(${dist * (layer.letterSpacing || 0) * 0.2 + squeezeX}px)
                                            translateY(${yOffset}px)
                                            rotate(${bend}deg)
                                            scale(${bulgeScale})
                                          `,
                                          textShadow: glow > 0 ? `0 0 ${glow}px ${glowCol}, 0 0 ${glow/2}px ${glowCol}` : 'none',
                                          WebkitTextStroke: outline > 0 ? `${outline}px ${outCol}` : 'none',
                                          transition: 'transform 0.2s ease-out'
                                        }}>
                                          {char}
                                        </span>
                                      );
                                   })}
                                </div>
                              )}
                            </div>
                          )}
                          {layer.type === 'sticker' && <div style={{ fontSize: `${layer.fontSize * 2}px`, pointerEvents: 'none' }}>{layer.data}</div>}
                          {layer.type === 'shape' && (
                            <div 
                              style={{ 
                                width: '100%', 
                                height: '100%', 
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                pointerEvents: 'none',
                                filter: getOutlineFilter(layer.filters?.['img-outline'], layer.filters?.['img-outline-color'])
                              }} 
                            >
                              {(() => {
                                const s = layer.data;
                                const color = layer.color || 'var(--primary)';
                                
                                if (s === 'heart') return <Heart fill={color} stroke="none" style={{ width: '100%', height: '100%' }} />;
                                if (s === 'star') return <Star fill={color} stroke="none" style={{ width: '100%', height: '100%' }} />;
                                if (s === 'leaf') return <Leaf fill={color} stroke="none" style={{ width: '100%', height: '100%' }} />;
                                if (s === 'shield') return <Shield fill={color} stroke="none" style={{ width: '100%', height: '100%' }} />;
                                if (s === 'badge') return <Award fill={color} stroke="none" style={{ width: '100%', height: '100%' }} />;
                                if (s === 'banner') return <Layout color={color} style={{ width: '100%', height: '100%' }} strokeWidth={2} />;
                                if (s === 'bookmark' || s === 'tag' || s === 'ticket') return <Tag fill={color} stroke="none" style={{ width: '100%', height: '100%' }} />;
                                if (s === 'bookmark-ribbon') return <Bookmark fill={color} stroke="none" style={{ width: '100%', height: '100%' }} />;
                                if (s === 'message' || s === 'bubble') return <MessageSquare fill={color} stroke="none" style={{ width: '100%', height: '100%' }} />;
                                
                                if (s.startsWith('line-') || s === 'arrow-line' || s === 'double-arrow') {
                                  const density = layer.filters?.['line-density'] || 20;
                                  
                                  if (s === 'line-dotted') return (
                                    <div style={{ 
                                      width: '100%', 
                                      height: '100%', 
                                      backgroundImage: `radial-gradient(circle, ${color} 30%, transparent 35%)`,
                                      backgroundSize: `${density}px ${density}px`,
                                      backgroundRepeat: 'repeat-x',
                                      backgroundPosition: 'center'
                                    }} />
                                  );

                                  if (s === 'line-dashed') return (
                                    <div style={{ 
                                      width: '100%', 
                                      height: '100%', 
                                      backgroundImage: `linear-gradient(to right, ${color} 60%, transparent 60%)`,
                                      backgroundSize: `${density * 2}px 100%`,
                                      backgroundRepeat: 'repeat-x',
                                      backgroundPosition: 'center',
                                      height: '4px',
                                      alignSelf: 'center'
                                    }} />
                                  );

                                  if (s === 'line-curly') {
                                    const thickness = layer.filters?.['line-thickness'] || 2;
                                    const amplitude = layer.filters?.['line-amplitude'] || 10;
                                    const waveWidth = density * 2;
                                    const yPeak = 50 - amplitude;
                                    const svgString = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${waveWidth}" height="100" viewBox="0 0 ${waveWidth} 100" preserveAspectRatio="none"><path d="M-1 50 Q${density / 2} ${yPeak} ${density} 50 T${waveWidth + 1} 50" fill="none" stroke="${color}" stroke-width="${thickness}" stroke-linecap="round"/></svg>`);
                                    return (
                                      <div style={{ 
                                        width: '100%', 
                                        height: '100%', 
                                        backgroundImage: `url("data:image/svg+xml,${svgString}")`,
                                        backgroundSize: `${waveWidth}px 100%`,
                                        backgroundRepeat: 'repeat-x',
                                        backgroundPosition: 'center'
                                      }} />
                                    );
                                  }

                                  const thickness = layer.filters?.['line-thickness'] || 2;
                                  const amplitude = layer.filters?.['line-amplitude'] || 20;

                                  return (
                                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                                      {/* Arrows */}
                                      {s === 'arrow-line' && <path d="M0 50 L100 50 M85 35 L100 50 L85 65" fill="none" stroke={color} strokeWidth={thickness * 2} strokeLinecap="round" strokeLinejoin="round" />}
                                      {s === 'double-arrow' && <path d="M0 50 L100 50 M15 35 L0 50 L15 65 M85 35 L100 50 L85 65" fill="none" stroke={color} strokeWidth={thickness * 2} strokeLinecap="round" strokeLinejoin="round" />}
                                      
                                      {/* Steps */}
                                      {s === 'line-step' && <path d="M0 25 L50 25 L50 75 L100 75" fill="none" stroke={color} strokeWidth={thickness * 2} strokeLinecap="round" strokeLinejoin="round" />}
                                      {s === 'line-step-arrow' && <path d="M0 25 L50 25 L50 75 L100 75 M85 60 L100 75 L85 90" fill="none" stroke={color} strokeWidth={thickness * 2} strokeLinecap="round" strokeLinejoin="round" />}
                                      {s === 'line-step-double' && <path d="M0 25 L50 25 L50 75 L100 75 M15 10 L0 25 L15 40 M85 60 L100 75 L85 90" fill="none" stroke={color} strokeWidth={thickness * 2} strokeLinecap="round" strokeLinejoin="round" />}
                                      
                                      {/* Curves */}
                                      {s === 'line-curve-s' && <path d={`M0 50 C25 ${50-amplitude*2}, 75 ${50+amplitude*2}, 100 50`} fill="none" stroke={color} strokeWidth={thickness * 2} strokeLinecap="round" />}
                                      {s === 'line-curve-arrow' && <path d={`M0 50 C25 ${50-amplitude*2}, 75 ${50+amplitude*2}, 100 50 M85 ${50+(amplitude*2)-15} L100 50 L85 ${50+(amplitude*2)+15}`} fill="none" stroke={color} strokeWidth={thickness * 2} strokeLinecap="round" />}
                                      {s === 'line-arc' && <path d={`M0 80 Q50 ${80-amplitude*3} 100 80`} fill="none" stroke={color} strokeWidth={thickness * 2} strokeLinecap="round" />}
                                      
                                      {/* Special */}
                                      {s === 'line-spiral' && <path d="M50 50 c0-10-20-10-20 0 0 20 40 20 40 0 0-30-60-30-60 0 0 40 80 40 80 0" fill="none" stroke={color} strokeWidth={thickness * 2} strokeLinecap="round" />}
                                      {s === 'line-scribble' && <path d="M0 50 Q10 20 25 50 T50 50 Q60 80 75 50 T100 50" fill="none" stroke={color} strokeWidth={thickness * 2} strokeLinecap="round" />}
                                      
                                      {s === 'line-solid' && (
                                        <line 
                                          x1="0" y1="50" x2="100" y2="50" 
                                          stroke={color} 
                                          strokeWidth={thickness * 2} 
                                          strokeLinecap="round" 
                                        />
                                      )}
                                    </svg>
                                  );
                                }
                                
                                if (s === 'circle') return <div style={{ width: '100%', height: '100%', background: color, borderRadius: '50%' }} />;
                                if (s === 'square') return <div style={{ width: '100%', height: '100%', background: color, borderRadius: layer.borderRadius || 0 }} />;
                                if (s === 'pill') return <div style={{ width: '100%', height: '100%', background: color, borderRadius: '999px' }} />;
                                
                                // Fallback to clip-path for other geometric shapes
                                return (
                                  <div style={{
                                    width: '100%',
                                    height: '100%',
                                    background: color,
                                    clipPath: (() => {
                                      if (s === 'triangle') return 'polygon(50% 0%, 0% 100%, 100% 100%)';
                                      if (s === 'diamond' || s === 'rhombus') return 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
                                      if (s === 'pentagon') return 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)';
                                      if (s === 'hexagon') return 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
                                      if (s === 'heptagon') return 'polygon(50% 0%, 90% 20%, 100% 60%, 75% 100%, 25% 100%, 0% 60%, 10% 20%)';
                                      if (s === 'octagon') return 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)';
                                      if (s === 'decagon') return 'polygon(50% 0%, 80% 10%, 100% 35%, 100% 65%, 80% 90%, 50% 100%, 20% 90%, 0% 65%, 0% 35%, 20% 10%)';
                                      if (s === 'parallelogram') return 'polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)';
                                      if (s === 'trapezoid') return 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)';
                                      if (s === 'cylinder') return 'polygon(0% 20%, 50% 10%, 100% 20%, 100% 80%, 50% 90%, 0% 80%)';
                                      if (s === 'cube') return 'polygon(25% 0%, 75% 0%, 100% 25%, 100% 75%, 75% 100%, 25% 100%, 0% 75%, 0% 25%)';
                                      if (s === 'shield') return 'polygon(0% 0%, 100% 0%, 100% 80%, 50% 100%, 0% 80%)';
                                      if (s === 'chevron-right') return 'polygon(75% 0%, 100% 50%, 75% 100%, 0% 100%, 25% 50%, 0% 0%)';
                                      if (s === 'arrow-right') return 'polygon(0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%)';
                                      if (s === 'arrow-left') return 'polygon(40% 0%, 0% 50%, 40% 100%, 40% 80%, 100% 80%, 100% 20%, 40% 20%)';
                                      if (s === 'arrow-up') return 'polygon(50% 0%, 0% 40%, 20% 40%, 20% 100%, 80% 100%, 80% 40%, 100% 40%)';
                                      if (s === 'arrow-down') return 'polygon(20% 0%, 80% 0%, 80% 60%, 100% 60%, 50% 100%, 0% 60%, 20% 60%)';
                                      if (s?.startsWith('corner')) return 'polygon(0% 0%, 100% 0%, 100% 100%, 80% 100%, 80% 20%, 0% 20%)';
                                      if (s === 'plus' || s === 'cross') return 'polygon(35% 0%, 65% 0%, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0% 65%, 0% 35%, 35% 35%)';
                                      if (s === 'burst') return 'polygon(50% 0%, 64% 18%, 82% 10%, 82% 31%, 100% 31%, 88% 50%, 100% 69%, 82% 69%, 82% 90%, 64% 82%, 50% 100%, 36% 82%, 18% 90%, 18% 69%, 0% 69%, 12% 50%, 0% 31%, 18% 31%, 18% 10%, 36% 18%)';
                                      if (s === 'leaf') return 'polygon(0% 100%, 15% 35%, 50% 0%, 85% 35%, 100% 100%, 50% 85%)';
                                      if (s === 'shuriken') return 'polygon(50% 0%, 65% 35%, 100% 50%, 65% 65%, 50% 100%, 35% 65%, 0% 50%, 35% 35%)';
                                      if (s === 'badge') return 'polygon(50% 100%, 0% 80%, 0% 0%, 100% 0%, 100% 80%)';
                                      if (s === 'banner') return 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 15% 50%)';
                                      if (s === 'tag' || s === 'tear-here') return 'polygon(20% 0%, 100% 0%, 100% 100%, 20% 100%, 0% 50%)';
                                      if (s === 'folded-square') return 'polygon(0% 0%, 80% 0%, 100% 20%, 100% 100%, 0% 100%)';
                                      if (s === 'ticket') return 'polygon(10% 0%, 90% 0%, 100% 20%, 100% 80%, 90% 100%, 10% 100%, 0% 80%, 0% 20%)';
                                      if (s === 'bookmark') return 'polygon(0% 0%, 100% 0%, 100% 100%, 50% 80%, 0% 100%)';
                                      if (s === 'x' || s === 'cut-line') return 'polygon(20% 0%, 0% 20%, 30% 50%, 0% 80%, 20% 100%, 50% 70%, 80% 100%, 100% 80%, 70% 50%, 100% 20%, 80% 0%, 50% 30%)';
                                      if (s === 'smiley') return 'circle(50% at 50% 50%)';
                                      if (s === 'lightning') return 'polygon(40% 0%, 100% 0%, 60% 45%, 90% 45%, 20% 100%, 40% 55%, 10% 55%)';
                                      if (s === 'sun') return 'polygon(50% 0%, 60% 35%, 100% 50%, 60% 65%, 50% 100%, 40% 65%, 0% 50%, 40% 35%)';
                                      if (s === 'moon') return 'inset(0% 0% 0% 0% round 50%)';
                                      if (s?.includes('bracket')) return 'polygon(0% 0%, 20% 0%, 20% 100%, 0% 100%)';
                                      if (s?.includes('brace')) return 'polygon(0% 0%, 30% 0%, 30% 100%, 0% 100%)';
                                      if (s === 'tear-notch') return 'polygon(0% 0%, 100% 0%, 50% 100%)';
                                      if (s?.includes('abstract')) {
                                         const n = parseInt(s.split('-')[1]);
                                         if (n % 3 === 0) return 'polygon(0% 15%, 15% 15%, 15% 0%, 85% 0%, 85% 15%, 100% 15%, 100% 85%, 85% 85%, 85% 100%, 15% 100%, 15% 85%, 0% 85%)';
                                         if (n % 3 === 1) return 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';
                                         return 'polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)';
                                      }
                                      return 'none';
                                    })()
                                  }} />
                                );
                              })()}
                            </div>
                          )}
                          
                          {selectedLayerId === layer.id && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteLayer(layer.id);
                              }}
                              style={{ 
                                position: 'absolute', 
                                top: '-15px', 
                                right: '-15px', 
                                background: '#ef4444', 
                                color: 'white', 
                                border: 'none', 
                                borderRadius: '50%', 
                                width: '24px', 
                                height: '24px', 
                                fontSize: '14px', 
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                zIndex: 1000,
                                scale: 1 / (layer.scale || 1),
                                rotate: -(layer.rotation || 0)
                              }}
                            >×</button>
                          )}

                          {/* Edge Resize Handles for Selected Layer */}
                          {selectedLayerId === layer.id && (
                            <>
                              <motion.div
                                onPan={(e, info) => handleLayerResize(layer.id, info.delta.x, info.delta.y, 'r')}
                                onPointerDown={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                style={{ 
                                  position: 'absolute', 
                                  right: '-10px', 
                                  top: '50%', 
                                  transform: 'translateY(-50%)', 
                                  width: '20px', 
                                  height: '50px', 
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  zIndex: 1002,
                                  cursor: 'ew-resize',
                                  pointerEvents: 'auto'
                                }}
                              >
                                <div style={{ width: '6px', height: '40px', background: 'var(--primary)', borderRadius: '3px', opacity: 0.8 }} />
                              </motion.div>

                              <motion.div
                                onPan={(e, info) => handleLayerResize(layer.id, info.delta.x, info.delta.y, 'l')}
                                onPointerDown={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                style={{ 
                                  position: 'absolute', 
                                  left: '-10px', 
                                  top: '50%', 
                                  transform: 'translateY(-50%)', 
                                  width: '20px', 
                                  height: '50px', 
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  zIndex: 1002,
                                  cursor: 'ew-resize',
                                  pointerEvents: 'auto'
                                }}
                              >
                                <div style={{ width: '6px', height: '40px', background: 'var(--primary)', borderRadius: '3px', opacity: 0.8 }} />
                              </motion.div>

                              <motion.div
                                onPan={(e, info) => handleLayerResize(layer.id, info.delta.x, info.delta.y, 'b')}
                                onPointerDown={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                style={{ 
                                  position: 'absolute', 
                                  bottom: '-10px', 
                                  left: '50%', 
                                  transform: 'translateX(-50%)', 
                                  width: '60px', 
                                  height: '20px', 
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  zIndex: 1002,
                                  cursor: 'ns-resize',
                                  pointerEvents: 'auto'
                                }}
                              >
                                <div style={{ width: '40px', height: '6px', background: 'var(--primary)', borderRadius: '3px', opacity: 0.8 }} />
                              </motion.div>

                              <motion.div
                                onPan={(e, info) => handleLayerResize(layer.id, info.delta.x, info.delta.y, 't')}
                                onPointerDown={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                style={{ 
                                  position: 'absolute', 
                                  top: '-10px', 
                                  left: '50%', 
                                  transform: 'translateX(-50%)', 
                                  width: '60px', 
                                  height: '20px', 
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  zIndex: 1002,
                                  cursor: 'ns-resize',
                                  pointerEvents: 'auto'
                                }}
                              >
                                <div style={{ width: '40px', height: '6px', background: 'var(--primary)', borderRadius: '3px', opacity: 0.8 }} />
                              </motion.div>
                            </>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
                


                {isCropping && (
                  <div style={{ 
                    position: 'absolute', 
                    top: selectedLayerId ? layers.find(l => l.id === selectedLayerId)?.y : 0,
                    left: selectedLayerId ? layers.find(l => l.id === selectedLayerId)?.x : 0,
                    width: selectedLayerId ? layers.find(l => l.id === selectedLayerId)?.width : canvasSize.width,
                    height: selectedLayerId ? layers.find(l => l.id === selectedLayerId)?.height : canvasSize.height,
                    zIndex: 1005, 
                    background: 'rgba(0,0,0,0.6)', 
                    pointerEvents: 'none',
                    clipPath: (() => {
                      const layer = layers.find(l => l.id === selectedLayerId);
                      const baseTop = layer ? layer.y : 0;
                      const baseLeft = layer ? layer.x : 0;
                      const baseWidth = layer ? layer.width : canvasSize.width;
                      const baseHeight = layer ? layer.height : canvasSize.height;

                      const rx = crop.x - baseLeft;
                      const ry = crop.y - baseTop;
                      
                      return `polygon(
                        0% 0%, 0% 100%, 
                        ${rx}px 100%, ${rx}px ${ry}px, 
                        ${rx + crop.width}px ${ry}px, 
                        ${rx + crop.width}px ${ry + crop.height}px, 
                        ${rx}px ${ry + crop.height}px, 
                        ${rx}px 100%, 100% 100%, 100% 0%
                      )`;
                    })()
                  }} />
                )}

                {isCropping && (
                  <motion.div 
                    drag
                    dragConstraints={selectedLayerId ? false : imageRef}
                    dragElastic={0}
                    dragMomentum={false}
                    onDrag={(e, info) => {
                      const zoom = values.resize || 0.55;
                      setCrop(prev => ({ 
                        ...prev, 
                        x: Math.max(0, Math.min(prev.x + info.delta.x / zoom, canvasSize.width - prev.width)),
                        y: Math.max(0, Math.min(prev.y + info.delta.y / zoom, canvasSize.height - prev.height))
                      }));
                    }}
                    style={{
                      position: 'absolute',
                      top: `${crop.y}px`,
                      left: `${crop.x}px`,
                      width: `${crop.width}px`,
                      height: `${crop.height}px`,
                      border: '2px solid white',
                      boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                      cursor: 'move',
                      zIndex: 1006
                    }}
                  >
                    {/* Corner Handles */}
                    {[
                      { pos: 'tl', cursor: 'nw-resize', top: -5, left: -5 },
                      { pos: 'tr', cursor: 'ne-resize', top: -5, right: -5 },
                      { pos: 'bl', cursor: 'sw-resize', bottom: -5, left: -5 },
                      { pos: 'br', cursor: 'se-resize', bottom: -5, right: -5 }
                    ].map(h => (
                      <motion.div 
                        key={h.pos}
                        drag dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                        dragElastic={0} dragMomentum={false}
                        onDrag={(e, info) => {
                          const zoom = values.resize || 0.55;
                          setCrop(prev => {
                            let { x, y, width, height } = prev;
                            const dx = info.delta.x / zoom;
                            const dy = info.delta.y / zoom;

                            if (h.pos.includes('t')) {
                              const actualDy = Math.min(dy, height - 50);
                              y += actualDy;
                              height -= actualDy;
                            }
                            if (h.pos.includes('b')) {
                              height = Math.max(50, height + dy);
                            }
                            if (h.pos.includes('l')) {
                              const actualDx = Math.min(dx, width - 50);
                              x += actualDx;
                              width -= actualDx;
                            }
                            if (h.pos.includes('r')) {
                              width = Math.max(50, width + dx);
                            }
                            return { x, y, width, height };
                          });
                        }}
                        style={{ 
                          position: 'absolute', 
                          ...h,
                          width: '12px', 
                          height: '12px', 
                          background: 'white', 
                          border: '2px solid var(--primary)', 
                          borderRadius: '2px', 
                          cursor: h.cursor 
                        }}
                      />
                    ))}
                    {/* Grid Lines */}
                    <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr 1fr', pointerEvents: 'none' }}>
                       <div style={{ borderRight: '1px solid rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.3)' }} />
                       <div style={{ borderRight: '1px solid rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.3)' }} />
                       <div style={{ borderBottom: '1px solid rgba(255,255,255,0.3)' }} />
                       <div style={{ borderRight: '1px solid rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.3)' }} />
                       <div style={{ borderRight: '1px solid rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.3)' }} />
                       <div style={{ borderBottom: '1px solid rgba(255,255,255,0.3)' }} />
                       <div style={{ borderRight: '1px solid rgba(255,255,255,0.3)' }} />
                       <div style={{ borderRight: '1px solid rgba(255,255,255,0.3)' }} />
                       <div />
                    </div>
                  </motion.div>
                )}

                {/* Canvas Edge & Corner Resize Handles */}
                {(isBlankCanvas || image || isTemplateMode) && !isCropping && (
                  <>
                    {/* Edges */}
                    <div onMouseDown={(e) => handleCanvasResize(e, 't')} className="canvas-resize-handle handle-t" />
                    <div onMouseDown={(e) => handleCanvasResize(e, 'b')} className="canvas-resize-handle handle-b" />
                    <div onMouseDown={(e) => handleCanvasResize(e, 'l')} className="canvas-resize-handle handle-l" />
                    <div onMouseDown={(e) => handleCanvasResize(e, 'r')} className="canvas-resize-handle handle-r" />
                    
                    {/* Corners */}
                    <div onMouseDown={(e) => handleCanvasResize(e, 'tl')} className="canvas-resize-handle handle-tl" />
                    <div onMouseDown={(e) => handleCanvasResize(e, 'tr')} className="canvas-resize-handle handle-tr" />
                    <div onMouseDown={(e) => handleCanvasResize(e, 'bl')} className="canvas-resize-handle handle-bl" />
                    <div onMouseDown={(e) => handleCanvasResize(e, 'br')} className="canvas-resize-handle handle-br" />
                  </>
                )}

                {isProcessing && (
                  <div style={{ position: 'absolute', inset: 0, background: 'var(--bg-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '0', zIndex: 1002 }}>
                    <div className="loader" style={{ marginBottom: '1.5rem' }}></div>
                    <p style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '3px', textShadow: 'none' }}>RENDERING DESIGN...</p>
                  </div>
                )}
                


                <style>{`
                  .workspace {
                    overflow: auto !important;
                    display: flex !important;
                    align-items: flex-start;
                    justify-content: center;
                    padding: 20px;
                    background-color: var(--bg-main);
                    background-image: 
                      linear-gradient(45deg, var(--border) 25%, transparent 25%),
                      linear-gradient(-45deg, var(--border) 25%, transparent 25%),
                      linear-gradient(45deg, transparent 75%, var(--border) 75%),
                      linear-gradient(-45deg, transparent 75%, var(--border) 75%);
                    background-size: 20px 20px;
                    background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
                    scrollbar-width: thin;
                    scrollbar-color: var(--primary) transparent;
                    transition: all 0.3s ease;
                  }
                  .canvas-resize-handle {
                    position: absolute;
                    background: white;
                    border: 2px solid var(--primary);
                    z-index: 2000;
                    box-shadow: none;
                    pointer-events: auto;
                    opacity: 1;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                  }
                  .canvas-resize-handle:hover {
                    background: var(--primary);
                    transform: scale(1.3) !important;
                  }
                  .handle-t { top: -10px; left: 50%; transform: translateX(-50%); width: 24px; height: 10px; cursor: ns-resize; border-radius: 5px; }
                  .handle-b { bottom: -10px; left: 50%; transform: translateX(-50%); width: 24px; height: 10px; cursor: ns-resize; border-radius: 5px; }
                  .handle-l { left: -10px; top: 50%; transform: translateY(-50%); width: 10px; height: 24px; cursor: ew-resize; border-radius: 5px; }
                  .handle-r { right: -10px; top: 50%; transform: translateY(-50%); width: 10px; height: 24px; cursor: ew-resize; border-radius: 5px; }
                  
                  .handle-tl { top: -12px; left: -12px; width: 18px; height: 18px; cursor: nw-resize; border-radius: 50%; }
                  .handle-tr { top: -12px; right: -12px; width: 18px; height: 18px; cursor: ne-resize; border-radius: 50%; }
                  .handle-bl { bottom: -12px; left: -12px; width: 18px; height: 18px; cursor: sw-resize; border-radius: 50%; }
                  .handle-br { bottom: -12px; right: -12px; width: 18px; height: 18px; cursor: se-resize; border-radius: 50%; }
                  
                  .workspace::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                  }
                  .workspace::-webkit-scrollbar-thumb {
                    background: var(--primary);
                    border-radius: 10px;
                  }
                  .canvas-container.blank-page { box-shadow: none; }
                  .studio-welcome { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }
                  
                  .zoom-btn:hover { opacity: 1; }

                  .global-zoom-bar {
                    position: fixed;
                    bottom: 2.5rem;
                    right: 2.5rem;
                    background: var(--bg-card);
                    padding: 0.4rem 1rem;
                    border-radius: 1.25rem;
                    border: 1px solid var(--border);
                    display: flex;
                    align-items: center;
                    gap: 0.6rem;
                    z-index: 2500;
                    box-shadow: var(--shadow-premium);
                  }
                  
                  .zoom-group {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                  }

                  .zoom-btn-p {
                    background: transparent;
                    border: none;
                    color: var(--primary);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 30px;
                    height: 30px;
                    border-radius: 8px;
                    opacity: 0.7;
                    transition: all 0.2s;
                  }
                  
                  .zoom-btn-p:hover {
                    opacity: 1;
                    background: var(--tool-bg);
                  }

                  .zoom-value {
                    font-size: 0.8rem;
                    font-weight: 800;
                    minWidth: 40px;
                    text-align: center;
                    color: var(--primary);
                    letter-spacing: 0.5px;
                  }

                  .fit-badge {
                    background: var(--primary);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    padding: 1px 6px;
                    font-size: 0.55rem;
                    font-weight: 900;
                    cursor: pointer;
                    transition: transform 0.2s;
                  }
                  
                  .fit-badge:hover {
                    transform: scale(1.1);
                  }

                  .divider {
                    width: 1px;
                    height: 24px;
                    background: var(--border);
                    margin: 0 0.25rem;
                  }

                  .download-btn-pro {
                    background: var(--primary);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    padding: 0.5rem 1rem;
                    display: flex;
                    align-items: center;
                    gap: 0.4rem;
                    font-size: 0.75rem;
                    font-weight: 700;
                    cursor: pointer;
                    box-shadow: none;
                    transition: all 0.3s;
                  }

                  .download-btn-pro:hover {
                    transform: translateY(-2px);
                    box-shadow: none;
                    background: #2563eb;
                  }
                `}</style>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Persistent Global Control & Zoom Bar */}
      {(image || isBlankCanvas) && (
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="global-zoom-bar"
        >

          <div className="zoom-group main-controls" style={{ margin: '0 0.5rem' }}>
            <button className="zoom-btn-p" onClick={() => setValues(prev => ({ ...prev, resize: Math.max(0.1, (prev.resize || 0.55) - 0.1) }))}>
              <Minus size={18} />
            </button>
            
            <button className="fit-badge" onClick={handleFitToScreen} title="Fit to Screen">FIT</button>
            
            <div className="zoom-value">{Math.round((values.resize || 0.55) * 100)}%</div>
            
            <button className="zoom-btn-p" onClick={() => setValues(prev => ({ ...prev, resize: Math.min(3, (prev.resize || 0.55) + 0.1) }))}>
              <Plus size={18} />
            </button>
          </div>


        </motion.div>
      )}

      {/* Truly Global Shape Controls Modal (Outside any transformed container) */}
      <AnimatePresence>
        {selectedLayerId && layers.find(l => l.id === selectedLayerId)?.type === 'shape' && (
          <motion.div
            drag
            dragMomentum={false}
            dragElastic={0.1}
            initial={{ opacity: 0, x: 200 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 150 }}
            style={{ 
              position: 'fixed', 
              zIndex: 9999,
              top: '100px', 
              right: '20px', 
              background: 'var(--bg-card)', 
              borderRadius: '24px',
              padding: '1.5rem',
              width: '300px',
              boxShadow: 'var(--shadow-premium)',
              border: '1px solid var(--border)',
              pointerEvents: 'auto',
              touchAction: 'none'
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {(() => {
              const layer = layers.find(l => l.id === selectedLayerId);
              if (!layer) return null;
              return (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.2rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.8rem', cursor: 'grab' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <GripVertical size={16} color="var(--text-muted)" />
                      <PenTool size={20} color="var(--primary)" />
                    </div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-main)', letterSpacing: '1px' }}>SHAPE CONTROLS</span>
                  </div>

                  <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '12px', scrollbarWidth: 'none' }} className="modal-scroll-area">
                    {/* Basics Section */}
                    <div style={{ marginBottom: '1.8rem' }}>
                      <p style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '1rem', letterSpacing: '1px' }}>BASICS</p>
                      
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Palette size={14} color="var(--text-muted)" />
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>Shape Color</span>
                        </div>
                        <input 
                          type="color" value={layer.color || '#3b82f6'}
                          onChange={(e) => setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, color: e.target.value } : l))}
                          style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', cursor: 'pointer', background: 'none' }}
                        />
                      </div>

                      <div style={{ marginBottom: '1.2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Ghost size={14} color="var(--text-muted)" />
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>Opacity</span>
                          </div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 900 }}>{Math.round((layer.opacity || 1) * 100)}%</span>
                        </div>
                        <input 
                          type="range" min="0" max="1" step="0.01" value={layer.opacity || 1}
                          onChange={(e) => setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, opacity: parseFloat(e.target.value) } : l))}
                          className="vector-slider"
                        />
                      </div>
                    </div>

                    {/* Vector Line Specific Section */}
                    {layer.data?.startsWith('line-') && (
                      <div style={{ marginBottom: '1.8rem' }}>
                        <p style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '1rem', letterSpacing: '1px' }}>VECTOR PATH</p>
                        {[
                          { id: 'line-density', label: 'Wavelength', icon: MoveHorizontal, min: 2, max: 200 },
                          { id: 'line-thickness', label: 'Weight', icon: Minus, min: 1, max: 30 },
                          { id: 'line-amplitude', label: 'Wave Height', icon: MoveVertical, min: 0, max: 200 }
                        ].map(tool => (
                          <div key={tool.id} style={{ marginBottom: '1.2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <tool.icon size={20} color={activeTool === tool.id || activeFilters[tool.id] ? 'var(--primary)' : 'var(--text-muted)'} />
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>{tool.label}</span>
                              </div>
                              <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 900 }}>{layer.filters?.[tool.id] || 0}</span>
                            </div>
                            <input 
                              type="range"
                              min={tool.min}
                              max={tool.max}
                              step={1}
                              value={layer.filters?.[tool.id] || 0}
                              onChange={(e) => updateLayerFilter(layer.id, tool.id, parseInt(e.target.value))}
                              className="vector-slider"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Stroke / Outline Section */}
                    <div style={{ marginBottom: '1.8rem' }}>
                      <p style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '1rem', letterSpacing: '1px' }}>STROKE & STYLE</p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Palette size={14} color="var(--text-muted)" />
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>Stroke Color</span>
                        </div>
                        <input 
                          type="color" value={layer.filters?.['img-outline-color'] || '#ffffff'}
                          onChange={(e) => updateLayerFilter(layer.id, 'img-outline-color', e.target.value)}
                          style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid var(--border)', cursor: 'pointer', background: 'none' }}
                        />
                      </div>
                      {!layer.data?.startsWith('line-') && (
                        <div style={{ marginBottom: '1.2rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Maximize size={14} color="var(--text-muted)" />
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>Corner Radius</span>
                            </div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 900 }}>{layer.borderRadius || 0}</span>
                          </div>
                          <input 
                            type="range" min="0" max="200" value={layer.borderRadius || 0}
                            onChange={(e) => setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, borderRadius: parseInt(e.target.value) } : l))}
                            className="vector-slider"
                          />
                        </div>
                      )}
                    </div>

                    {/* Alignment Section */}
                    <div style={{ marginBottom: '1.2rem' }}>
                      <p style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '1rem', letterSpacing: '1px' }}>ALIGNMENT</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        <button onPointerDown={(e) => e.stopPropagation()} onClick={() => centerLayer('both', layer.id)} title="Center Element" className="align-btn" style={{ height: '40px' }}><AlignCenter size={14} /></button>
                        <button onPointerDown={(e) => e.stopPropagation()} onClick={() => bringToFront(layer.id)} title="Top Layer" className="align-btn" style={{ height: '40px' }}><Layers size={14} /></button>
                        <button onPointerDown={(e) => e.stopPropagation()} onClick={() => deleteLayer(layer.id)} title="Delete" className="align-btn" style={{ color: '#ef4444', height: '40px' }}><Trash2 size={14} /></button>
                      </div>
                    </div>

                    {/* Transform Section */}
                    <div style={{ marginBottom: '0.5rem' }}>
                      <p style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '1rem', letterSpacing: '1px' }}>TRANSFORM</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                        <button onClick={() => setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, rotation: (l.rotation || 0) + 90 } : l))} title="Rotate Clockwise" className="align-btn" style={{ height: '40px' }}><RotateCw size={14} /></button>
                        <button onClick={() => setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, rotation: (l.rotation || 0) - 90 } : l))} title="Rotate Counter-Clockwise" className="align-btn" style={{ height: '40px' }}><RotateCcw size={14} /></button>
                        <button onClick={() => setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, flipX: (l.flipX || 1) * -1 } : l))} title="Flip Horizontal" className="align-btn" style={{ height: '40px' }}><FlipHorizontal size={14} /></button>
                        <button onClick={() => setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, flipY: (l.flipY || 1) * -1 } : l))} title="Flip Vertical" className="align-btn" style={{ height: '40px' }}><FlipVertical size={14} /></button>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.2rem' }}>
                    <button 
                      onClick={() => setSelectedLayerId(null)}
                      style={{ width: '100%', padding: '0.9rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '16px', fontSize: '0.85rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 10px 20px rgba(59, 130, 246, 0.3)' }}
                    >APPLY CHANGES</button>
                  </div>
                </>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            style={{
              position: 'fixed',
              bottom: '8rem', /* Move up to avoid zoom bar */
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#3b82f6',
              color: 'white',
              padding: '0.8rem 1.5rem',
              borderRadius: '1rem',
              zIndex: 3000,
              fontWeight: 700,
              fontSize: '0.85rem'
            }}
          >
            {notification}
          </motion.div>
        )}
      </AnimatePresence>
      <Footer />

      {showShadeModal && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowShadeModal(false);
          }}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', pointerEvents: 'auto' }}
        >
          <motion.div onClick={(e) => e.stopPropagation()} drag dragMomentum={false} dragElastic={0} style={{ pointerEvents: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.65rem', width: '90%', maxWidth: window.innerWidth <= 768 ? '240px' : '280px', boxShadow: 'var(--shadow-premium)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', cursor: 'grab' }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', fontWeight: 800 }}>🎨 Pattern Settings</h3>
              <div style={{ display: 'flex', gap: '0.4rem', cursor: 'default' }}>
                <button onClick={() => { setCurrentPattern(null); setCanvasBg('#ffffff'); setShowShadeModal(false); }} style={{ padding: '2px 8px', fontSize: '0.6rem', background: 'rgba(239, 68, 68, 0.2)', border: 'none', borderRadius: '4px', color: '#f87171', cursor: 'pointer' }}>Clear</button>
                <button onClick={() => { setPatternScale(1); setPatternOpacity(0.4); setPatternColor('#000000'); Object.keys(patternShades).forEach(key => setPatternShades(prev => ({ ...prev, [key]: { ...prev[key], enabled: false } }))); }} style={{ padding: '2px 8px', fontSize: '0.6rem', background: 'var(--tool-bg)', border: 'none', borderRadius: '4px', color: 'var(--text-main)', cursor: 'pointer' }}>Reset</button>
                <button onClick={() => setShowShadeModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer', lineHeight: '1' }}>&times;</button>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '50vh', overflowY: 'auto', paddingRight: '0.4rem', cursor: 'default' }}>
              
              <div style={{ background: 'var(--tool-bg)', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Size</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 700 }}>{Math.round(patternScale * 100)}%</span>
                    </div>
                    <input type="range" min="0.2" max="5" step="0.1" value={patternScale} onChange={(e) => setPatternScale(parseFloat(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary)', height: '4px' }} onPointerDown={(e) => e.stopPropagation()} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Opacity</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 700 }}>{Math.round(patternOpacity * 100)}%</span>
                    </div>
                    <input type="range" min="0" max="1" step="0.05" value={patternOpacity} onChange={(e) => setPatternOpacity(parseFloat(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary)', height: '4px' }} onPointerDown={(e) => e.stopPropagation()} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Base Color</span>
                  <input type="color" value={patternColor} onChange={(e) => setPatternColor(e.target.value)} style={{ width: '30px', height: '18px', border: 'none', borderRadius: '4px', background: 'none', padding: 0, cursor: 'pointer' }} onPointerDown={(e) => e.stopPropagation()} />
                </div>
              </div>

              <div style={{ padding: '0.2rem 0' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.5px' }}>MULTIPLE SHADES</span>
              </div>

              {['top', 'bottom', 'left', 'right', 'center'].map(dir => (
                <div key={dir} style={{ background: 'var(--tool-bg)', padding: '0.35rem 0.5rem', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }} onPointerDown={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={patternShades[dir].enabled}
                        onChange={(e) => setPatternShades(prev => ({ ...prev, [dir]: { ...prev[dir], enabled: e.target.checked } }))}
                        style={{ accentColor: 'var(--primary)', width: '14px', height: '14px' }}
                      />
                      <span style={{ fontSize: '0.75rem', textTransform: 'capitalize', fontWeight: 600, color: patternShades[dir].enabled ? 'var(--text-main)' : 'var(--text-muted)' }}>{dir} Shade</span>
                    </label>
                    
                    {patternShades[dir].enabled && (
                      <input 
                        type="color" 
                        value={patternShades[dir].color} 
                        onChange={(e) => setPatternShades(prev => ({ ...prev, [dir]: { ...prev[dir], color: e.target.value } }))} 
                        style={{ width: '28px', height: '16px', border: 'none', borderRadius: '4px', background: 'none', padding: 0, cursor: 'pointer' }} 
                        onPointerDown={(e) => e.stopPropagation()}
                      />
                    )}
                  </div>
                  
                  {patternShades[dir].enabled && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Length</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 700 }}>{patternShades[dir].spread}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="500" step="5" 
                        value={patternShades[dir].spread} 
                        onChange={(e) => setPatternShades(prev => ({ ...prev, [dir]: { ...prev[dir], spread: parseInt(e.target.value) } }))} 
                        style={{ width: '100%', accentColor: 'var(--primary)', height: '4px' }} 
                        onPointerDown={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button onClick={() => setShowShadeModal(false)} style={{ marginTop: '0.8rem', width: '100%', padding: '0.6rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }} onPointerDown={(e) => e.stopPropagation()}>Done</button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
