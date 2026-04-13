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
  Thermometer, Tv, User, Video, Watch, Wifi, UtensilsCrossed,
  MoveHorizontal, MoveVertical, AlignLeft, AlignCenter, AlignRight,
  Activity, Layout, Triangle, Box, Grid, LayoutGrid, Diamond, Award, Leaf, Bookmark, Pentagon, Magnet, Eraser
} from 'lucide-react';

export const CATEGORIES = ['Text', 'Cleanup', 'Image', 'Patterns', 'Draw', 'Presets', 'Transform', 'Magic Tools'];

export const FONTS = [
  'Inter', 'Poppins', 'Montserrat', 'Roboto', 'Open Sans', 'Lato', 'Playfair Display', 
  'Lora', 'PT Serif', 'Merriweather', 'Oswald', 'Raleway', 'Ubuntu', 'Nunito', 
  'Source Sans 3', 'Dancing Script', 'Pacifico', 'Fira Code', 'Bebas Neue', 'Anton', 
  'Satisfy', 'Caveat', 'Great Vibes', 'Allura', 'Courgette', 'Yellowtail', 'Amatic SC', 
  'Luckiest Guy', 'Lobster', 'Righteous', 'Russo One', 'Bungee', 'Space Grotesk', 
  'Outfit', 'Work Sans', 'Public Sans', 'DM Sans', 'Noto Sans', 'Exo 2', 'Kanit', 
  'Prompt', 'Rubik', 'Heebo', 'Saira', 'Space Mono', 'JetBrains Mono', 'Source Code Pro',
  'IBM Plex Mono', 'Inconsolata', 'Courier Prime', 'Anonymous Pro', 'Major Mono Display',
  'Alegreya', 'Cormorant', 'EB Garamond', 'Literata', 'Spectral', 'Taviraj', 
  'Titillium Web', 'Varela Round', 'Wix Madefor Display'
];

export const TOOLS_DEFS = [
  // Cleanup Category (AI Magic)
  { id: 'remove-bg-layer', label: 'Magic Remove BG', icon: Wand2, category: 'Cleanup' },
  { id: 'object-remover', label: 'Object Eraser', icon: Eraser, category: 'Cleanup' },
  { id: 'auto-tune', label: 'Magic Polish', icon: Sparkles, category: 'Cleanup' },
  { id: 'denoise', label: 'Denoise AI', icon: Zap, category: 'Cleanup' },
  { id: 'upscale', label: 'Upscale 2x', icon: Maximize, category: 'Cleanup' },
  { id: 'remove-color-picker', label: 'Color Stripper', icon: Droplet, category: 'Cleanup' },

  // Image Category Tools
  { id: 'add-image-layer', label: 'Add Image', icon: ImageIcon, category: 'Image' },
  { id: 'brightness', label: 'Brightness', icon: Sun, category: 'Image', min: -100, max: 100, default: 0, unit: '%' },
  { id: 'contrast', label: 'Contrast', icon: Contrast, category: 'Image', min: -100, max: 100, default: 0, unit: '%' },
  { id: 'saturation', label: 'Saturation', icon: Droplet, category: 'Image', min: -100, max: 100, default: 0, unit: '%' },
  { id: 'exposure', label: 'Exposure', icon: Zap, category: 'Image', min: -100, max: 100, default: 0, unit: '%' },
  { id: 'gamma', label: 'Gamma', icon: Settings, category: 'Image', min: 0.1, max: 2, default: 1, step: 0.1 },
  { id: 'temperature', label: 'Temp', icon: Thermometer, category: 'Image', min: -100, max: 100, default: 0 },
  { id: 'tint', label: 'Tint', icon: Palette, category: 'Image', min: -100, max: 100, default: 0 },
  { id: 'vibrance', label: 'Vibrance', icon: Wind, category: 'Image', min: -100, max: 100, default: 0 },
  { id: 'highlights', label: 'Highlights', icon: Sun, category: 'Image', min: -100, max: 100, default: 0 },
  { id: 'shadows', label: 'Shadows', icon: Moon, category: 'Image', min: -100, max: 100, default: 0 },
  { id: 'clarity', label: 'Clarity', icon: Focus, category: 'Image', min: 0, max: 100, default: 0 },
  { id: 'invert', label: 'Invert', icon: EyeOff, category: 'Image', min: 0, max: 100, default: 0, unit: '%' },

  // Presets
  { id: 'sepia', label: 'Sepia', icon: Camera, category: 'Presets', min: 0, max: 100, default: 0, unit: '%' },
  { id: 'grayscale', label: 'Grayscale', icon: Moon, category: 'Presets', min: 0, max: 100, default: 0, unit: '%' },
  { id: 'noir', label: 'Noir', icon: EyeOff, category: 'Presets', min: 0, max: 100, default: 0, unit: '%' },
  { id: 'vintage', label: 'Vintage', icon: Camera, category: 'Presets', min: 0, max: 100, default: 0, unit: '%' },
  { id: 'cinematic', label: 'Cinematic', icon: Video, category: 'Presets', min: 0, max: 100, default: 0, unit: '%' },
  { id: 'polaroid', label: 'Polaroid', icon: ImageIcon, category: 'Presets', min: 0, max: 100, default: 0, unit: '%' },
  { id: 'kodak', label: 'Kodak', icon: ImageIcon, category: 'Presets', min: 0, max: 100, default: 0, unit: '%' },

  // Transform
  { id: 'img-order', label: 'Layer Order', icon: Layers, category: 'Transform' },
  { id: 'export-design', label: 'Export', icon: Download, category: 'Transform' },
  { id: 'crop', label: 'Crop', icon: Crop, category: 'Transform' },
  { id: 'rotateL', label: 'Rotate L', icon: RotateCcw, category: 'Transform' },
  { id: 'rotateR', label: 'Rotate R', icon: RotateCw, category: 'Transform' },
  { id: 'flipH', label: 'Flip H', icon: FlipHorizontal, category: 'Transform' },
  { id: 'flipV', label: 'Flip V', icon: FlipVertical, category: 'Transform' },
  { id: 'resize', label: 'Resize', icon: Maximize, category: 'Transform', min: 0.1, max: 2, default: 1, step: 0.1 },

  // Text
  { id: 'add-text', label: 'Add Text', icon: Type, category: 'Text' },
  { id: 'font-size', label: 'Font Size', icon: Maximize, category: 'Text', min: 10, max: 200, default: 32 },
  { id: 'text-color', label: 'Color', icon: Palette, category: 'Text' },
  { id: 'font-family', label: 'Font', icon: Type, category: 'Text' },
  { id: 'text-curve', label: 'Curve Arc', icon: Activity, category: 'Text', min: -150, max: 150, default: 0 },
  { id: 'text-bulge', label: 'Bulge', icon: Maximize, category: 'Text', min: -100, max: 100, default: 0 },
  { id: 'text-outline', label: 'Outline', icon: Square, category: 'Text', min: 0, max: 15, default: 0 },
  { id: 'text-outline-color', label: 'Stroke Color', icon: Palette, category: 'Text' },
  { id: 'text-squeeze', label: 'Squeeze', icon: Minus, category: 'Text', min: -100, max: 100, default: 0 },
  { id: 'text-glow', label: 'Glow Blur', icon: Sparkles, category: 'Text', min: 0, max: 60, default: 0 },
  { id: 'text-glow-color', label: 'Glow Color', icon: Ghost, category: 'Text' },

  // Draw Tools
  { id: 'draw-none', label: 'None', icon: MousePointer2, category: 'Draw' },
  { id: 'brush-tool', label: 'Brush', icon: PenTool, category: 'Draw' },
  { id: 'brush-type', label: 'Brush Texture', icon: Activity, category: 'Draw' },
  { id: 'brush-size', label: 'Size', icon: Maximize, category: 'Draw', min: 1, max: 100, default: 10 },
  { id: 'brush-color', label: 'Color', icon: Palette, category: 'Draw' },
  { id: 'eraser-tool', label: 'Eraser', icon: Eraser, category: 'Draw' },
  { id: 'lasso-regular', label: 'Lasso', icon: MousePointer2, category: 'Draw' },
  { id: 'lasso-polygonal', label: 'Poly Lasso', icon: Pentagon, category: 'Draw' },

  // Magic Tools
  { id: 'stickers', label: 'Stickers', icon: Smile, category: 'Magic Tools' },
  { id: 'add-shape', label: 'Add Shape', icon: Square, category: 'Magic Tools' },
  { id: 'bg-changer', label: 'Change BG', icon: Palette, category: 'Magic Tools' },
  { id: 'gradient-bg', label: 'Gradient BG', icon: Wand2, category: 'Magic Tools' },

  // Patterns
  { id: 'p-clean', label: 'Clean White', icon: Square, category: 'Patterns' },
  { id: 'p-dots', label: 'Polka Dots', icon: Grid || LayoutGrid || Square, category: 'Patterns' },
  { id: 'p-grid', label: 'Graph Paper', icon: Grid || LayoutGrid || Square, category: 'Patterns' },
  { id: 'p-diagonal', label: 'Diagonal', icon: MoveHorizontal, category: 'Patterns' },
  { id: 'p-check', label: 'Checkered', icon: Grid || LayoutGrid || Square, category: 'Patterns' },
  { id: 'p-waves', label: 'Waves', icon: Wind, category: 'Patterns' },
  { id: 'p-stars', label: 'Star Night', icon: Star, category: 'Patterns' },
  { id: 'p-bricks', label: 'Bricks', icon: Square, category: 'Patterns' },
  { id: 'p-carbon', label: 'Carbon', icon: Zap, category: 'Patterns' },
  { id: 'p-blueprint', label: 'Blueprint', icon: Layout, category: 'Patterns' },
  { id: 'p-luxury', label: 'Luxury', icon: Diamond, category: 'Patterns' },
  { id: 'p-noise', label: 'Noise', icon: Droplet, category: 'Patterns' },
  { id: 'p-paper', label: 'Fiber Paper', icon: Files, category: 'Patterns' },
];
