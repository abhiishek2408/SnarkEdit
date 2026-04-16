import React from 'react';
import { 
  Image as ImageIcon, X, Undo, Redo, Download, 
  Sun, Moon, Layers, Layout, Edit3
} from 'lucide-react';

const Sidebar = ({ 
  CATEGORIES, 
  activeCategory, 
  setActiveCategory, 
  TOOLS, 
  activeTool, 
  setActiveTool, 
  activeFilters, 
  toggleFilter, 
  handleRemoveBG, 
  handleAutoTone, 
  handleMagicClean,
  applyTemplate, 
  applyTransform, 
  fileInputRef, 
  selectedLayerId, 
  bringToFront, 
  centerLayer, 
  addLayer, 
  applyPattern, 
  setShowShadeModal,
  showSidebar,
  setShowSidebar,
  onUndo, 
  onRedo, 
  onDownload, 
  historyIndex, 
  historyLength, 
  theme, 
  toggleTheme, 
  showLayerPanel, 
  setShowLayerPanel,
  setIsBlankCanvas,
  setIsTemplateMode,
  isBlankCanvas,
  isTemplateMode
}) => {
  return (
    <>
      {showSidebar && <div 
        className="sidebar-overlay mobile-only" 
        onClick={() => setShowSidebar(false)}
      ></div>}
      <aside className={`sidebar glass ${showSidebar ? 'show' : ''}`}>
        <div className="sidebar-header">
          {/* Mobile Specific Header Actions */}
          <div className="mobile-only" style={{ display: 'none', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
             <p style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '1px' }}>QUICK ACTIONS</p>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                <button className="icon-btn" onClick={onUndo} disabled={historyIndex <= 0} style={{ width: '100%', height: '45px', borderRadius: '12px' }}><Undo size={20} /></button>
                <button className="icon-btn" onClick={onRedo} disabled={historyIndex >= historyLength - 1} style={{ width: '100%', height: '45px', borderRadius: '12px' }}><Redo size={20} /></button>
                <button className="icon-btn" onClick={() => setShowLayerPanel(!showLayerPanel)} style={{ width: '100%', height: '45px', borderRadius: '12px', color: showLayerPanel ? 'var(--primary)' : 'inherit' }}><Layers size={20} /></button>
                <button className="icon-btn" onClick={toggleTheme} style={{ width: '100%', height: '45px', borderRadius: '12px' }}>{theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}</button>
             </div>
             
             <button className="btn-primary" onClick={onDownload} style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                <Download size={18} />
                <span>Export Design</span>
             </button>

             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                <button 
                  onClick={() => { setIsBlankCanvas(false); setIsTemplateMode(false); setShowSidebar(false); }}
                  style={{ background: !isBlankCanvas && !isTemplateMode ? 'var(--primary)' : 'var(--tool-bg)', color: !isBlankCanvas && !isTemplateMode ? 'white' : 'var(--text-main)', border: 'none', padding: '10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                >
                  <Edit3 size={14} /> Editor
                </button>
                <button 
                  onClick={() => { setIsBlankCanvas(true); setIsTemplateMode(false); setShowSidebar(false); }}
                  style={{ background: isBlankCanvas ? 'var(--primary)' : 'var(--tool-bg)', color: isBlankCanvas ? 'white' : 'var(--text-main)', border: 'none', padding: '10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                >
                  <Layout size={14} /> Canvas
                </button>
             </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Categories</p>
            <button className="icon-btn mobile-only" onClick={() => setShowSidebar(false)} style={{ display: 'none', padding: '4px' }}>
              <X size={18} />
            </button>
          </div>
          <div className="category-list">
          {CATEGORIES.map(cat => (
            <button 
              key={cat} 
              className={`category-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="tools-grid">
        {TOOLS.filter(t => t.category === activeCategory).map(tool => (
          <button 
            key={tool.id} 
            className={`tool-item ${activeTool === tool.id || activeFilters[tool.id] ? 'active' : ''}`}
            onClick={() => {
              setActiveTool(tool.id);
              if (tool.category === 'Presets') {
                toggleFilter(tool.id);
              }
              if (tool.category === 'Image' && tool.min === undefined && !['add-image-layer', 'remove-bg-layer', 'img-order'].includes(tool.id)) {
                 toggleFilter(tool.id);
              }
              if (tool.id === 'auto-remove' || tool.id === 'person-cutout' || tool.id === 'remove-bg-layer') handleRemoveBG();
              if (tool.id === 'autoTone') handleAutoTone();
              if (tool.category === 'Cleanup') handleMagicClean(tool.id);
              if (tool.category === 'Templates') applyTemplate(tool.id);
              if (tool.category === 'Transform') applyTransform(tool.id);
              if (tool.id === 'add-image-layer') fileInputRef.current?.click();
              if (tool.id === 'img-order' && selectedLayerId) bringToFront(selectedLayerId);
              if (tool.id === 'img-align') {
                if (selectedLayerId) centerLayer('both', selectedLayerId);
              }
              if (tool.id === 'add-text') addLayer('text', 'Your Text Here');

              if (tool.category === 'Patterns') {
                applyPattern(tool.id);
                setShowShadeModal(true);
              }
            }}
          >
            {tool.icon ? (
              <tool.icon size={20} color={activeTool === tool.id || activeFilters[tool.id] ? 'var(--primary)' : 'var(--text-muted)'} />
            ) : (
              <ImageIcon size={20} color="var(--text-muted)" />
            )}
            <span>{tool.label}</span>
          </button>
        ))}
      </div>
    </aside>
    </>
  );
};

export default Sidebar;
