import React from 'react';
import { FileText, ChevronRight } from 'lucide-react';

interface PDFListSidebarProps {
  projectName: string;
  files: File[];
  selectedPdf: File | null;
  onPdfSelect: (file: File) => void;
}

const PDFListSidebar: React.FC<PDFListSidebarProps> = ({
  projectName,
  files,
  selectedPdf,
  onPdfSelect,
}) => {
  return (
    <div className="w-64 bg-gray-800 text-white flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold">{projectName}</h2>
        <p className="text-sm text-gray-400 mt-1">{files.length} Documents</p>
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
            <FileText size={20} className="text-gray-400 mr-3" />
            <div className="text-left">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-gray-400">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            {selectedPdf === file && (
              <ChevronRight size={16} className="ml-auto text-blue-400" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PDFListSidebar;