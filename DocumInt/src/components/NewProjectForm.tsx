import React, { useState, useRef } from 'react';
import { FileText, Upload, X } from 'lucide-react';

interface NewProjectFormProps {
  onClose: () => void;
  onSubmit: (name: string, files: File[]) => void;
}

const NewProjectForm: React.FC<NewProjectFormProps> = ({ onClose, onSubmit }) => {
  const [projectName, setProjectName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFiles([...selectedFiles, ...Array.from(event.target.files)]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (projectName && selectedFiles.length > 0) {
      // Save PDFs to localStorage before submitting
      const storageKey = `arena_pdfs_${projectName}`;
      
      try {
        // Store the file names in localStorage for persistence
        const fileNames = selectedFiles.map(file => file.name);
        localStorage.setItem(storageKey, JSON.stringify(fileNames));
        
        // Also store file metadata for better tracking (optional)
        const fileMetadata = selectedFiles.map(file => ({
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        }));
        localStorage.setItem(`${storageKey}_metadata`, JSON.stringify(fileMetadata));
        
        console.log(`Saved ${selectedFiles.length} PDFs to localStorage for project: ${projectName}`);
      } catch (error) {
        console.error('Error saving PDFs to localStorage:', error);
        // Continue with submission even if localStorage fails
      }
      
      // Call the original onSubmit callback
      onSubmit(projectName, selectedFiles);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">New Project</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-2">
              Project Name
            </label>
            <input
              id="projectName"
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter project name"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload PDFs
            </label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">Click to upload PDFs</p>
              <p className="text-xs text-gray-500">Supports multiple PDF files</p>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".pdf"
              multiple
              onChange={handleFileSelect}
            />
          </div>

          {selectedFiles.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Selected Files ({selectedFiles.length}):
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded transition-colors hover:bg-gray-100">
                    <div className="flex items-center min-w-0 flex-1">
                      <FileText size={20} className="text-gray-500 mr-2 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-sm text-gray-600 block truncate" title={file.name}>
                          {file.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-gray-400 hover:text-red-500 flex-shrink-0 ml-2 p-1 rounded hover:bg-gray-200 transition-colors"
                      title="Remove file"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!projectName || selectedFiles.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewProjectForm;