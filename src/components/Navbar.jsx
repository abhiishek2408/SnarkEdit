import { Smile, Undo, Redo, Download, Image as ImageIcon, Home, Sun, Moon, Menu, X, Layers } from 'lucide-react';

const Navbar = ({ isTemplateMode, setIsTemplateMode, isBlankCanvas, setIsBlankCanvas, historyIndex, historyLength, onUndo, onRedo, image, isStudioMode, onDownload, onUploadTrigger, onHome, theme, toggleTheme, showSidebar, setShowSidebar, showLayerPanel, setShowLayerPanel }) => {
  return (
    <nav className="navbar glass">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button className="icon-btn mobile-only" onClick={() => setShowSidebar(!showSidebar)} style={{ border: 'none', background: 'transparent' }}>
           <Menu size={24} color={showSidebar ? 'var(--primary)' : 'var(--text-main)'} />
        </button>
        <div className="brand" onClick={onHome} style={{ cursor: 'pointer' }}>
          <div className="brand-icon">
            <Smile color="white" size={24} />
          </div>
          <div className="brand-text">
            <h1>SnarkEdit</h1>
            <p>Professional Image Studio</p>
          </div>
        </div>
      </div>

      <div className="nav-links desktop-only">
        <a href="#" className={!isTemplateMode && !isBlankCanvas ? 'active' : ''} onClick={() => {
          setIsTemplateMode(false);
          setIsBlankCanvas(false);
        }}>Editor</a>
        <a href="#" className={isBlankCanvas ? 'active' : ''} onClick={() => {
          setIsBlankCanvas(true);
          setIsTemplateMode(false);
        }}>Blank Canvas</a>
      </div>

      <div className="nav-actions desktop-only">
        <button className="icon-btn" onClick={() => setShowLayerPanel(!showLayerPanel)} title={showLayerPanel ? 'Hide Layers' : 'Show Layers'} style={{ color: showLayerPanel ? 'var(--primary)' : 'inherit' }}>
          <Layers size={18} />
        </button>
        <button className="icon-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="icon-btn" title="Undo" disabled={historyIndex <= 0} onClick={onUndo}>
          <Undo size={18} />
        </button>
        <button className="icon-btn" title="Redo" disabled={historyIndex >= historyLength - 1} onClick={onRedo}>
          <Redo size={18} />
        </button>
        { (image || isTemplateMode || isBlankCanvas || isStudioMode) && (
          <button className="btn-primary" onClick={onDownload}>
            <Download size={18} />
            <span>Export</span>
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
