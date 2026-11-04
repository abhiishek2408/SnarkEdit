import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Undo,
  Redo,
  Download,
  Sun,
  Moon,
  Layers,
  Brain,
  Image as ImageIcon,
  ChevronDown,
  Search,
  Menu,
  X,
  FileText,
  Files,
  Scissors,
  Crop,
  FilePlus,
  Palette,
  Columns2,
  Sliders,
  Wand2,
  Home,
} from 'lucide-react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { APP_TOOL_LINKS, SEARCH_ITEMS } from '../constants/searchContent';

const Navbar = ({
  isTemplateMode,
  isBlankCanvas,
  historyIndex,
  historyLength,
  onUndo,
  onRedo,
  image,
  isStudioMode,
  onDownload,
  onHome,
  onOpenPhotoEditor,
  landingMode = true,
  theme,
  toggleTheme,
  showLayerPanel,
  setShowLayerPanel,
  hideEditorControls,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pdfToolsMenuRef = useRef(null);
  const imageToolsMenuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const trimmedQuery = searchQuery.trim().toLowerCase();

  // Close menus when clicking outside
  useEffect(() => {
    const closeMenusOutside = (event) => {
      [pdfToolsMenuRef, imageToolsMenuRef].forEach((menuRef) => {
        if (menuRef.current && !menuRef.current.contains(event.target)) {
          menuRef.current.open = false;
        }
      });
    };
    document.addEventListener('pointerdown', closeMenusOutside);
    return () => document.removeEventListener('pointerdown', closeMenusOutside);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    setIsMobileMenuOpen(false);
    if (item.type === 'editor-tool') {
      navigate('/', { state: { searchToolId: item.toolId, searchCategory: item.category } });
      return;
    }

    navigate(item.path);
  };

  const handleGoHome = (e) => {
    setIsMobileMenuOpen(false);
    onHome?.(e);
  };

  return (
    <>
      <nav className={`navbar glass ${landingMode ? 'landing-navbar' : ''}`}>
        {/* Brand Logo & Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Link to="/" className="brand" onClick={handleGoHome} style={{ cursor: 'pointer', textDecoration: 'none' }}>
            <div className="brand-icon" style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}>
              <svg width="0" height="0" style={{ position: 'absolute' }}>
                <linearGradient id="nav-brain-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="35%" stopColor="#3b82f6" />
                  <stop offset="70%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </svg>
              <Brain size={30} color="url(#nav-brain-gradient)" strokeWidth={2.5} />
            </div>
            <div className="brand-text">
              <h1>DocEdit</h1>
              <p>Professional Image & PDF Studio</p>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation Links (when landingMode) */}
        {landingMode ? (
          <div className="landing-top-links desktop-only">
            <details className="landing-tools-menu" ref={pdfToolsMenuRef}>
              <summary>PDF Tools <ChevronDown size={14} /></summary>
              <div className="landing-tools-dropdown">
                {APP_TOOL_LINKS.filter((tool) => [
                  '/split-pdf-page',
                  '/edit-pdf',
                  '/merge-documents',
                  '/stack-pdf-pages',
                  '/crop-pdf-whitespace',
                  '/create-pdf-from-image',
                ].includes(tool.path)).map((tool) => (
                  <Link key={tool.path} to={tool.path}>{tool.title}</Link>
                ))}
              </div>
            </details>

            <details className="landing-tools-menu" ref={imageToolsMenuRef}>
              <summary>Image Tools <ChevronDown size={14} /></summary>
              <div className="landing-tools-dropdown">
                <button type="button" onClick={() => {
                  if (onOpenPhotoEditor) onOpenPhotoEditor();
                  else navigate('/photo-editor');
                }}>Photo Editor</button>
                <Link to="/blank-canvas">White Canvas</Link>
                {APP_TOOL_LINKS.filter((tool) => ['/reduce-image-size', '/enhance-image'].includes(tool.path)).map((tool) => (
                  <Link key={tool.path} to={tool.path}>{tool.title}</Link>
                ))}
              </div>
            </details>

            <button
              className="icon-btn theme-toggle-btn"
              type="button"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            <button className="landing-sign-in" type="button">Sign in</button>
          </div>
        ) : (
          /* Desktop Navigation Actions (when in Studio / Editor mode) */
          <div className="nav-actions desktop-only" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.75rem' }}>
            {!isStudioMode && (
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
            )}

            {!isStudioMode && (
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
            )}

            {!hideEditorControls && (
              <button
                className="icon-btn"
                onClick={() => setShowLayerPanel(!showLayerPanel)}
                title={showLayerPanel ? 'Hide Layers' : 'Show Layers'}
                style={{ color: showLayerPanel ? 'var(--primary)' : 'inherit' }}
              >
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
                {(image || isTemplateMode || isBlankCanvas || isStudioMode) && (
                  <button
                    className="btn-primary"
                    disabled={!(image || isBlankCanvas || isTemplateMode)}
                    style={{
                      opacity: !(image || isBlankCanvas || isTemplateMode) ? 0.5 : 1,
                      cursor: !(image || isBlankCanvas || isTemplateMode) ? 'not-allowed' : 'pointer',
                    }}
                    onClick={onDownload}
                  >
                    <Download size={18} />
                    <span>Export</span>
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Mobile Navbar Controls (visible on <= 768px) */}
        <div className="nav-mobile-actions">
          {/* Mobile Theme Toggle Button */}
          <button
            className="icon-btn mobile-theme-btn"
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Quick Export on Mobile if in Editor mode */}
          {!hideEditorControls && (image || isTemplateMode || isBlankCanvas || isStudioMode) && (
            <button
              className="btn-primary mobile-export-btn"
              disabled={!(image || isBlankCanvas || isTemplateMode)}
              onClick={onDownload}
              title="Export"
            >
              <Download size={16} />
            </button>
          )}

          {/* Hamburger Menu Toggle Button */}
          <button
            type="button"
            className={`nav-hamburger-btn ${isMobileMenuOpen ? 'active' : ''}`}
            onClick={() => setIsMobileMenuOpen(prev => !prev)}
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile Navigation Drawer Backdrop */}
      <div
        className={`mobile-nav-backdrop ${isMobileMenuOpen ? 'open' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile Navigation Drawer */}
      <aside
        className={`mobile-nav-drawer ${isMobileMenuOpen ? 'open' : ''}`}
        aria-hidden={!isMobileMenuOpen}
        aria-label="Mobile Navigation"
      >
        {/* Drawer Header */}
        <div className="mobile-drawer-header">
          <Link to="/" className="brand" onClick={handleGoHome} style={{ textDecoration: 'none' }}>
            <div className="brand-icon" style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}>
              <Brain size={26} color="url(#nav-brain-gradient)" strokeWidth={2.5} />
            </div>
            <div className="brand-text">
              <h1 style={{ fontSize: '1.15rem' }}>DocEdit</h1>
              <p style={{ display: 'block', fontSize: '0.62rem' }}>Studio & Tools</p>
            </div>
          </Link>
          <button
            type="button"
            className="mobile-drawer-close-btn"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close navigation menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Instant Search */}
        <div className="mobile-drawer-search">
          <Search size={16} />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search all tools and features..."
            aria-label="Search tools"
          />
          {trimmedQuery && (
            <div className="nav-search-results mobile-search-results">
              {searchResults.length > 0 ? (
                searchResults.map((item) => {
                  const ResultIcon = item.icon || Search;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSearchResult(item)}
                    >
                      <ResultIcon size={16} />
                      <span>
                        <strong>{item.title}</strong>
                        <small>{item.category || item.description}</small>
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="no-matches" style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  No tools matched "{searchQuery}"
                </p>
              )}
            </div>
          )}
        </div>

        {/* Drawer Scrollable Content */}
        <div className="mobile-drawer-body">
          {/* Quick Home Link */}
          <NavLink
            to="/"
            end
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) => `mobile-drawer-link ${isActive ? 'active' : ''}`}
          >
            <div className="link-icon-wrap"><Home size={18} /></div>
            <div className="link-text-wrap">
              <strong>Home Dashboard</strong>
              <small>Explore all studio & PDF tools</small>
            </div>
          </NavLink>

          {/* Section: PDF Tools */}
          <div className="mobile-drawer-section">
            <div className="mobile-drawer-section-title">
              <FileText size={15} />
              <span>PDF Tools</span>
            </div>
            <div className="mobile-drawer-links">
              <NavLink
                to="/split-pdf-page"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => `mobile-drawer-link ${isActive ? 'active' : ''}`}
              >
                <div className="link-icon-wrap" style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444' }}>
                  <Scissors size={18} />
                </div>
                <div className="link-text-wrap">
                  <strong>Split PDF Page</strong>
                  <small>Divide oversized page into 2 with margins</small>
                </div>
                <span className="mobile-badge-new">New</span>
              </NavLink>

              <NavLink
                to="/edit-pdf"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => `mobile-drawer-link ${isActive ? 'active' : ''}`}
              >
                <div className="link-icon-wrap"><FileText size={18} /></div>
                <div className="link-text-wrap">
                  <strong>Edit PDF</strong>
                  <small>Annotate, draw, shapes & text</small>
                </div>
              </NavLink>

              <NavLink
                to="/stack-pdf-pages"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => `mobile-drawer-link ${isActive ? 'active' : ''}`}
              >
                <div className="link-icon-wrap"><Files size={18} /></div>
                <div className="link-text-wrap">
                  <strong>Stack PDF Pages</strong>
                  <small>Place 2 pages on 1 sheet vertically</small>
                </div>
              </NavLink>

              <NavLink
                to="/crop-pdf-whitespace"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => `mobile-drawer-link ${isActive ? 'active' : ''}`}
              >
                <div className="link-icon-wrap"><Crop size={18} /></div>
                <div className="link-text-wrap">
                  <strong>Crop PDF Pages</strong>
                  <small>Trim whitespace & page margins</small>
                </div>
              </NavLink>

              <NavLink
                to="/merge-documents"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => `mobile-drawer-link ${isActive ? 'active' : ''}`}
              >
                <div className="link-icon-wrap"><Files size={18} /></div>
                <div className="link-text-wrap">
                  <strong>Merge Documents</strong>
                  <small>Combine multiple PDFs & images</small>
                </div>
              </NavLink>

              <NavLink
                to="/create-pdf-from-image"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => `mobile-drawer-link ${isActive ? 'active' : ''}`}
              >
                <div className="link-icon-wrap"><FilePlus size={18} /></div>
                <div className="link-text-wrap">
                  <strong>Image to PDF</strong>
                  <small>Convert photos into a single PDF</small>
                </div>
              </NavLink>
            </div>
          </div>

          {/* Section: Image Tools */}
          <div className="mobile-drawer-section">
            <div className="mobile-drawer-section-title">
              <ImageIcon size={15} />
              <span>Photo & Image Tools</span>
            </div>
            <div className="mobile-drawer-links">
              <button
                type="button"
                className="mobile-drawer-link"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  if (onOpenPhotoEditor) onOpenPhotoEditor();
                  else navigate('/photo-editor');
                }}
              >
                <div className="link-icon-wrap"><Palette size={18} /></div>
                <div className="link-text-wrap">
                  <strong>Photo Editor Studio</strong>
                  <small>Full layered canvas editor</small>
                </div>
              </button>

              <NavLink
                to="/blank-canvas"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => `mobile-drawer-link ${isActive ? 'active' : ''}`}
              >
                <div className="link-icon-wrap"><Columns2 size={18} /></div>
                <div className="link-text-wrap">
                  <strong>White Canvas</strong>
                  <small>Create art from a blank canvas</small>
                </div>
              </NavLink>

              <NavLink
                to="/reduce-image-size"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => `mobile-drawer-link ${isActive ? 'active' : ''}`}
              >
                <div className="link-icon-wrap"><Sliders size={18} /></div>
                <div className="link-text-wrap">
                  <strong>Reduce Image KB</strong>
                  <small>Compress & resize photos for upload</small>
                </div>
              </NavLink>

              <NavLink
                to="/enhance-image"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => `mobile-drawer-link ${isActive ? 'active' : ''}`}
              >
                <div className="link-icon-wrap"><Wand2 size={18} /></div>
                <div className="link-text-wrap">
                  <strong>Enhance Image</strong>
                  <small>Sharpen, color balance & contrast</small>
                </div>
              </NavLink>
            </div>
          </div>

          {/* Drawer Footer Actions */}
          <div className="mobile-drawer-footer">
            <button
              type="button"
              className="mobile-drawer-action-btn"
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              <span>{theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
            </button>
            <button
              className="landing-sign-in mobile-full"
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Sign in
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Navbar;
