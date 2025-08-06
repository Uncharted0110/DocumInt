import React from 'react';
import { X } from 'lucide-react';
import logo from "../assets/logo.png";

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
  activeToolbar,
  onToggleToolbar,
  onCloseToolbar,
  onActionClick,
}) => {
  return (
    <>
      {/* Minimized Toolbar - Far Left */}
      <div className="w-16 bg-slate-50 flex flex-col items-center py-4 space-y-2">
        {toolbarOptions.map(tool => (
          <button
            key={tool.id}
            onClick={() => onToggleToolbar(tool.id)}
            className={`p-3 rounded-lg transition-all duration-200 ${
              activeToolbar === tool.id
                ? 'text-orange-500 bg-slate-50 shadow-lg border-1 border-black'
                : 'text-slate-600 hover:text-slate-50 hover:bg-orange-500'
            }`}
            title={tool.title}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      {/* Expandable Tool Sidebar */}
      {activeToolbar && (
        <div className="w-80 bg-slate-50 border-r border-slate-200 shadow-lg">
          {/* Header with Logo */}
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-left mb-4">
              <img 
                src={logo} 
                alt="DocumInt Logo" 
                className="h-20 w-24 w-auto"
              />
            </div>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">
                {toolbarOptions.find(t => t.id === activeToolbar)?.title} Tools
              </h3>
              <button
                onClick={onCloseToolbar}
                className="p-1 text-slate-500 hover:text-slate-700 rounded"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          
          {/* Actions */}
          <div className="p-4">
            <div className="space-y-3">
              {toolbarOptions
                .find(t => t.id === activeToolbar)
                ?.actions.map(action => (
                <button
                  key={action.id}
                  onClick={() => onActionClick(action.id, activeToolbar)}
                  className="w-full flex items-center p-4 bg-white rounded-lg hover:bg-orange-50 transition-colors border border-slate-200 hover:border-orange-200"
                >
                  <div className="text-orange-500 mr-4">{action.icon}</div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-slate-800">{action.title}</div>
                    <div className="text-sm text-slate-600">{action.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ToolBar;