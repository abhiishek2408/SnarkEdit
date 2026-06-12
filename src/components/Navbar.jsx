import { Smile, Undo, Redo, Download, Image as ImageIcon, Home, Sun, Moon, Menu, X, Layers, Brain } from 'lucide-react';
import { Link } from 'react-router-dom';

const Navbar = ({ isTemplateMode, setIsTemplateMode, isBlankCanvas, setIsBlankCanvas, historyIndex, historyLength, onUndo, onRedo, image, isStudioMode, onDownload, onUploadTrigger, onHome, theme, toggleTheme, showSidebar, setShowSidebar, showLayerPanel, setShowLayerPanel, hideEditorControls }) => {
  return (
    <nav className="navbar glass">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>

        <Link to="/" className="brand" onClick={onHome} style={{ cursor: 'pointer', textDecoration: 'none' }}>
          <div className="brand-icon" style={{ background: 'transparent', boxShadow: 'none' }}>
            <svg width="0" height="0" style={{ position: 'absolute' }}>
              <linearGradient id="nav-brain-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="30%" stopColor="#ec4899" />
                <stop offset="70%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </svg>
            <Brain size={28} color="url(#nav-brain-gradient)" strokeWidth={2.5} />
          </div>
          <div className="brand-text">
            <h1>SnarkEdit</h1>
            <p>Professional Image Studio</p>
          </div>
        </Link>
      </div>


      <div className="nav-actions desktop-only" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.75rem' }}>
        {!hideEditorControls && (
          <button className="icon-btn" onClick={() => setShowLayerPanel(!showLayerPanel)} title={showLayerPanel ? 'Hide Layers' : 'Show Layers'} style={{ color: showLayerPanel ? 'var(--primary)' : 'inherit' }}>
            <Layers size={18} />
          </button>
        )}
        <button className="icon-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        {!hideEditorControls && (
          <>
            <button className="icon-btn" title="Undo" disabled={historyIndex <= 0} onClick={onUndo}>
              <Undo size={18} />
            </button>
            <button className="icon-btn" title="Redo" disabled={historyIndex >= historyLength - 1} onClick={onRedo}>
              <Redo size={18} />
            </button>
            { (image || isTemplateMode || isBlankCanvas || isStudioMode) && (
              <button className="btn-primary" disabled={!(image || isBlankCanvas || isTemplateMode)} style={{ opacity: !(image || isBlankCanvas || isTemplateMode) ? 0.5 : 1, cursor: !(image || isBlankCanvas || isTemplateMode) ? 'not-allowed' : 'pointer' }} onClick={onDownload}>
                <Download size={18} />
                <span>Export</span>
              </button>
            )}
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
