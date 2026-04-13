import React from 'react';

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
  setShowSidebar
}) => {
  return (
    <>
      {showSidebar && <div 
        className="sidebar-overlay mobile-only" 
        onClick={() => setShowSidebar(false)}
      ></div>}
      <aside className={`sidebar glass ${showSidebar ? 'show' : ''}`}>
        <div className="mobile-only" style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem' }}>
          <button className="icon-btn" onClick={() => setShowSidebar(false)}>
            <X size={20} />
          </button>
        </div>
      <div className="sidebar-header">
        <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Categories</p>
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
            <tool.icon size={20} color={activeTool === tool.id || activeFilters[tool.id] ? 'var(--primary)' : 'var(--text-muted)'} />
            <span>{tool.label}</span>
          </button>
        ))}
      </div>
    </aside>
    </>
  );
};

export default Sidebar;
