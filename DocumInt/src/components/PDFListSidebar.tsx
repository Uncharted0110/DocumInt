import React from 'react';
import { FileText, ChevronRight, ChevronLeft, LucideTrash } from 'lucide-react';

interface PDFListSidebarProps {
  projectName: string;
  files: File[];
  selectedPdf: File | null;
  onPdfSelect: (file: File) => void;
  isMinimized: boolean;
  onToggleMinimize: () => void;
  onRemovePdf?: (file: File) => void;
}

const PDFListSidebar: React.FC<PDFListSidebarProps> = ({
  projectName,
  files,
  selectedPdf,
  onPdfSelect,
  isMinimized,
  onToggleMinimize,
  onRemovePdf,
}) => {
  return (
    <div
      className={`bg-gray-800 text-white h-screen flex flex-col transition-all duration-300 ease-in-out ${isMinimized ? 'w-16' : 'w-64'
        }`}
    >
      {/* Header - Fixed */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
        {!isMinimized && (
          <div className="min-w-0 flex-1 mr-2">
            <h2 className="text-lg font-semibold truncate" title={projectName}>
              {projectName}
            </h2>
            <p className="text-sm text-gray-400">{files.length} Documents</p>
          </div>
        )}
        <button
          onClick={onToggleMinimize}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
          title={isMinimized ? 'Expand sidebar' : 'Minimize sidebar'}
        >
          {isMinimized ? (
            <ChevronRight size={20} />
          ) : (
            <ChevronLeft size={20} />
          )}
        </button>
      </div>
      
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4">
            <FileText size={32} className="mb-2" />
            {!isMinimized && <p className="text-sm text-center">No PDFs in this project</p>}
          </div>
        ) : (
          <div className="py-1">
            {files.map((file, index) => (
              <div key={index} className="relative group">
                <button
                  onClick={() => onPdfSelect(file)}
                  className={`w-full flex items-center px-4 py-3 hover:bg-gray-700 transition-colors ${
                    selectedPdf === file ? 'bg-gray-700' : ''
                  } ${isMinimized ? 'justify-center' : ''}`}
                >
                  <div className="flex-shrink-0">
                    <FileText size={20} className="text-gray-400" />
                  </div>
                  {!isMinimized && (
                    <div className="ml-3 text-left min-w-0 flex-1 pr-8">
                      <p className="text-sm font-medium truncate" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  )}
                </button>
                
                {/* Remove button - only show when not minimized */}
                {!isMinimized && onRemovePdf && (
                  <button
                    className="absolute top-1/2 right-2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-red-500 hover:bg-gray-600 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove PDF"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemovePdf(file);
                    }}
                  >
                    <LucideTrash size={16} />
                  </button>
                )}

                {/* Tooltip for minimized state */}
                {isMinimized && (
                  <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    <div className="font-medium">{file.name}</div>
                    <div className="text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFListSidebar;