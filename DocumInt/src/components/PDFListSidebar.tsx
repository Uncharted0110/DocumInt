import React from 'react';
import { FileText, ChevronRight, ChevronLeft } from 'lucide-react';

interface PDFListSidebarProps {
  projectName: string;
  files: File[];
  selectedPdf: File | null;
  onPdfSelect: (file: File) => void;
  isMinimized: boolean;
  onToggleMinimize: () => void;
}

const PDFListSidebar: React.FC<PDFListSidebarProps> = ({
  projectName,
  files,
  selectedPdf,
  onPdfSelect,
  isMinimized,
  onToggleMinimize,
}) => {
  return (
    <div
      className={`bg-gray-800 text-white flex flex-col transition-all duration-300 ease-in-out ${
        isMinimized ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {!isMinimized && (
          <div>
            <h2 className="text-lg font-semibold truncate">{projectName}</h2>
            <p className="text-sm text-gray-400">{files.length} Documents</p>
          </div>
        )}
        <button
          onClick={onToggleMinimize}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          title={isMinimized ? 'Expand sidebar' : 'Minimize sidebar'}
        >
          {isMinimized ? (
            <ChevronRight size={20} />
          ) : (
            <ChevronLeft size={20} />
          )}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {files.map((file, index) => (
          <button
            key={index}
            onClick={() => onPdfSelect(file)}
            className={`w-full flex items-center px-4 py-3 hover:bg-gray-700 transition-colors ${
              selectedPdf === file ? 'bg-gray-700' : ''
            }`}
          >
            <FileText size={20} className="text-gray-400 min-w-[20px]" />
            {!isMinimized && (
              <div className="ml-3 text-left">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-gray-400">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PDFListSidebar;