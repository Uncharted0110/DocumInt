import React, { useState } from 'react';
import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react';
import logo from "../assets/horizontalLogo.png";

export interface ToolbarAction {
  id: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick?: () => void;
}

export interface ToolbarItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  actions: ToolbarAction[];
}

interface ToolBarProps {
  toolbarOptions: ToolbarItem[];
  activeToolbar: string | null;
  onToggleToolbar: (toolId: string) => void;
  onCloseToolbar: () => void;
  onActionClick: (actionId: string, toolId: string) => void;
}

const ToolBar: React.FC<ToolBarProps> = ({
  toolbarOptions,
  onActionClick,
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const handleDropdown = (toolId: string) => {
    setOpenDropdown(openDropdown === toolId ? null : toolId);
  };

  return (
    <header className="w-full bg-slate-50 border-b border-slate-200 shadow flex items-center px-6 py-2 z-10">
      {/* Logo */}
      <div className="flex items-center mr-8">
        <img src={logo} alt="DocumInt Logo" className="h-12 w-auto" />
      </div>
      {/* Toolbar Options */}
      <nav className="flex items-center space-x-4">
        {toolbarOptions.map(tool => (
          <div key={tool.id} className="relative">
            {tool.actions.length > 1 ? (
              <button
                className="flex items-center px-4 py-2 rounded hover:bg-[#0a1653]/10 text-slate-700 font-medium transition-colors"
                onClick={() => handleDropdown(tool.id)}
              >
                <span className="mr-2">{tool.icon}</span>
                {tool.title}
                <span className="ml-1">
                  {openDropdown === tool.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </span>
              </button>
            ) : (
              <button
                className="flex items-center px-4 py-2 rounded hover:bg-[#0a1653]/10 text-slate-700 font-medium transition-colors"
                onClick={() => onActionClick(tool.actions[0].id, tool.id)}
              >
                <span className="mr-2">{tool.icon}</span>
                {tool.title}
              </button>
            )}
            {/* Dropdown for suboptions */}
            {tool.actions.length > 1 && openDropdown === tool.id && (
              <div className="absolute left-0 mt-2 w-56 bg-white border border-slate-200 rounded shadow-lg z-20">
                {tool.actions.map(action => (
                  <button
                    key={action.id}
                    onClick={() => {
                      onActionClick(action.id, tool.id);
                      setOpenDropdown(null);
                    }}
                    className="w-full flex items-center px-4 py-3 hover:bg-[#0a1653]/5 text-slate-700 border-b last:border-b-0 border-slate-100"
                  >
                    <span className="text-[#0a1653] mr-3">{action.icon}</span>
                    <span className="flex-1 text-left font-medium">{action.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </header>
  );
};

export default ToolBar;