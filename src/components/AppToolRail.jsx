import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home } from 'lucide-react';
import { APP_TOOL_LINKS } from '../constants/searchContent';

const AppToolRail = ({ onHome }) => (
  <aside className="app-tool-rail" aria-label="Image tools">
    <p>Tools</p>
    <NavLink to="/" end title="Home" onClick={onHome}>
      <Home size={20} strokeWidth={1.8} />
      <span>Home</span>
    </NavLink>
    {APP_TOOL_LINKS.map((tool) => {
      const ToolIcon = tool.icon;
      return (
        <NavLink key={tool.path} to={tool.path} title={tool.description}>
          {ToolIcon && <ToolIcon size={20} strokeWidth={1.8} />}
          <span>{tool.title}</span>
        </NavLink>
      );
    })}
  </aside>
);

export default AppToolRail;
