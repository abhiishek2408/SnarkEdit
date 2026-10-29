import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Clock3, Home } from 'lucide-react';
import { APP_TOOL_LINKS } from '../constants/searchContent';

const AppToolRail = ({ onHome }) => (
  <aside className="app-tool-rail" aria-label="Image tools">
    <NavLink to="/" end title="Home" onClick={() => {
      onHome?.();
      window.dispatchEvent(new Event('snarkedit:home'));
    }}>
      <Home size={20} strokeWidth={1.8} />
      <span>Home</span>
    </NavLink>
    <Link to="/#landing-features" title="Recent tools">
      <Clock3 size={20} strokeWidth={1.8} />
      <span>Recent</span>
    </Link>
    <p>TOOLS</p>
    {APP_TOOL_LINKS.filter((tool) => ['/edit-pdf', '/merge-documents', '/stack-pdf-pages', '/crop-pdf-whitespace', '/create-pdf-from-image'].includes(tool.path)).map((tool) => {
      const ToolIcon = tool.icon;
      return (
        <NavLink key={tool.path} to={tool.path} title={tool.description}>
          {ToolIcon && <ToolIcon size={20} strokeWidth={1.8} />}
          <span>{tool.title}</span>
        </NavLink>
      );
    })}
    <p>PHOTO TOOLS</p>
    {APP_TOOL_LINKS.filter((tool) => ['/enhance-image', '/reduce-image-size'].includes(tool.path)).map((tool) => {
      const ToolIcon = tool.icon;
      return <NavLink key={tool.path} to={tool.path} title={tool.description}>
        {ToolIcon && <ToolIcon size={20} strokeWidth={1.8} />}
        <span>{tool.title}</span>
      </NavLink>;
    })}
  </aside>
);

export default AppToolRail;
