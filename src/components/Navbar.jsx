import React, { useMemo, useState } from 'react';
import { Undo, Redo, Download, Sun, Moon, Layers, Brain, Image as ImageIcon, ChevronDown, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { APP_TOOL_LINKS, SEARCH_ITEMS } from '../constants/searchContent';

const Navbar = ({ isTemplateMode, isBlankCanvas, historyIndex, historyLength, onUndo, onRedo, image, isStudioMode, onDownload, onHome, theme, toggleTheme, showLayerPanel, setShowLayerPanel, hideEditorControls }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const trimmedQuery = searchQuery.trim().toLowerCase();

  const searchResults = useMemo(() => {
    if (!trimmedQuery) return [];

    return SEARCH_ITEMS.filter((item) => {
      const haystack = [
        item.title,
        item.description,
        item.category,
        ...(item.keywords || []),
      ].join(' ').toLowerCase();

      return haystack.includes(trimmedQuery);
    }).slice(0, 8);
  }, [trimmedQuery]);

  const handleSearchResult = (item) => {
    setSearchQuery('');
    if (item.type === 'editor-tool') {
      navigate('/', { state: { searchToolId: item.toolId, searchCategory: item.category } });
      return;
    }

    navigate(item.path);
  };

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
            <h1>SimpleEdit</h1>
            <p>Professional Image Studio</p>
          </div>
        </Link>
      </div>


      <div className="nav-actions desktop-only" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.75rem' }}>
        <div className="nav-search">
          <Search size={16} />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search tools and content"
            aria-label="Search tools and content"
          />
          {trimmedQuery && (
            <div className="nav-search-results">
              {searchResults.length > 0 ? (
                searchResults.map((item) => {
                  const ResultIcon = item.icon || Search;
                  return (
                    <button key={item.id} type="button" onClick={() => handleSearchResult(item)}>
                      <ResultIcon size={16} />
                      <span>
                        <strong>{item.title}</strong>
                        <small>{item.category || item.description}</small>
                      </span>
                    </button>
                  );
                })
              ) : (
                <p>No matches found</p>
              )}
            </div>
          )}
        </div>
        <details className="nav-tools-menu">
          <summary className="nav-tool-link" title="Image tools">
            <ImageIcon size={16} />
            <span>Image Tools</span>
            <ChevronDown size={14} />
          </summary>
          <div className="nav-tools-dropdown">
            {APP_TOOL_LINKS.map((tool) => {
              const ToolIcon = tool.icon || ImageIcon;
              return (
                <Link key={tool.path} to={tool.path}>
                  <ToolIcon size={16} />
                  <span>{tool.title}</span>
                </Link>
              );
            })}
          </div>
        </details>
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



