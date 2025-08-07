import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  Plus, 
  Trash2, 
  Edit3, 
  Download,
  Upload,
  RefreshCw,
  Brain,
  Zap,
  Eye,
  Copy,
  Settings,
  Share2,
  Bookmark,
  Search,
  File,
} from 'lucide-react';
import ToolBar from './components/ToolBar';
import PDFViewer from './components/PDFViewer';
import Chat from './components/Chat';

// Extend window type to include AdobeDC
declare global {
  interface Window {
    AdobeDC?: any;
  }
}

const DocumentViewer = () => {
  const [activeToolbar, setActiveToolbar] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState('1');
  const [expandedSections, setExpandedSections] = useState(['1', '2']);
  const [activeTab, setActiveTab] = useState('quick');
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory] = useState<{ id: string; type: "bot" | "user"; message: string; }[]>([
    { id: crypto.randomUUID(), type: 'bot', message: 'Hello! Upload a PDF to get started, then I can help you analyze it!' }
  ]);
  
  // PDF-related state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState('');
  const [isAdobeLoaded, setIsAdobeLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Adobe PDF Embed API
  useEffect(() => {
    const loadAdobeAPI = () => {
      if (window.AdobeDC) {
        setIsAdobeLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://documentservices.adobe.com/view-sdk/viewer.js';
      script.onload = () => {
        setIsAdobeLoaded(true);
      };
      script.onerror = () => {
        console.error('Failed to load Adobe PDF Embed API');
      };
      document.head.appendChild(script);
    };

    loadAdobeAPI();
  }, []);  

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      alert('Please select a valid PDF file');
      return;
    }
    const file = files[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setPdfFileName(file.name);
      
      // Create object URL for the PDF
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
    } else {
      alert('Please select a valid PDF file');
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  // Initialize toolbar configuration and action handlers
  const toolbarOptions = [
    {
      id: 'pdf',
      title: 'PDF',
      icon: <FileText size={20} />,
      actions: [
        { id: 'add-pdf', icon: <Plus size={18} />, title: 'Add PDF', desc: 'Upload new PDF' },
        { id: 'delete-pdf', icon: <Trash2 size={18} />, title: 'Delete PDF', desc: 'Remove current PDF' },
        { id: 'download-pdf', icon: <Download size={18} />, title: 'Download PDF', desc: 'Save PDF locally' }
      ]
    },
    {
      id: 'mindmap',
      title: 'Mindmap',
      icon: <Brain size={20} />,
      actions: [
        { id: 'create-mindmap', icon: <Plus size={18} />, title: 'Create Mindmap', desc: 'Generate mindmap from document' },
        { id: 'view-mindmap', icon: <Eye size={18} />, title: 'View Mindmap', desc: 'Open existing mindmap' },
        { id: 'export-mindmap', icon: <Download size={18} />, title: 'Export Mindmap', desc: 'Save mindmap as image' }
      ]
    },
    {
      id: 'conversion',
      title: 'Conversion',
      icon: <RefreshCw size={20} />,
      actions: [
        { id: 'to-word', icon: <Upload size={18} />, title: 'To Word', desc: 'Convert to DOCX format' },
        { id: 'to-text', icon: <Copy size={18} />, title: 'To Text', desc: 'Extract plain text' },
        { id: 'to-html', icon: <Edit3 size={18} />, title: 'To HTML', desc: 'Convert to web format' }
      ]
    },
    {
      id: 'summary',
      title: 'Summary',
      icon: <Zap size={20} />,
      actions: [
        { id: 'generate-summary', icon: <Plus size={18} />, title: 'Generate Summary', desc: 'AI-powered summary' },
        { id: 'key-points', icon: <Eye size={18} />, title: 'Key Points', desc: 'Extract main points' },
        { id: 'export-summary', icon: <Download size={18} />, title: 'Export Summary', desc: 'Save summary as document' }
      ]
    },
    {
      id: 'search',
      title: 'Search',
      icon: <Search size={20} />,
      actions: [
        { id: 'full-text-search', icon: <Search size={18} />, title: 'Full Text Search', desc: 'Search through entire document' },
        { id: 'semantic-search', icon: <Brain size={18} />, title: 'Semantic Search', desc: 'AI-powered content search' },
        { id: 'bookmarks', icon: <Bookmark size={18} />, title: 'Bookmarks', desc: 'Manage document bookmarks' }
      ]
    },
    {
      id: 'sharing',
      title: 'Share',
      icon: <Share2 size={20} />,
      actions: [
        { id: 'share-link', icon: <Share2 size={18} />, title: 'Share Link', desc: 'Generate shareable link' },
        { id: 'export-share', icon: <Download size={18} />, title: 'Export & Share', desc: 'Export and share document' },
        { id: 'collaborate', icon: <Eye size={18} />, title: 'Collaborate', desc: 'Enable collaborative editing' }
      ]
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: <Settings size={20} />,
      actions: [
        { id: 'preferences', icon: <Settings size={18} />, title: 'Preferences', desc: 'Configure app settings' },
        { id: 'themes', icon: <Eye size={18} />, title: 'Themes', desc: 'Change app appearance' },
        { id: 'shortcuts', icon: <Plus size={18} />, title: 'Shortcuts', desc: 'View keyboard shortcuts' }
      ]
    }
  ];

  const handleActionClick = () => {
     
  };

  const documentOutline = [
    []
  ];

  const toggleToolbar = (toolId: string) => {
    setActiveToolbar(activeToolbar === toolId ? null : toolId);
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleSendMessage = () => {
  };

  const renderOutlineItem = (item: { id: string; title: string; level: number; children: any[] }) => {
    const isExpanded = expandedSections.includes(item.id);
    const isSelected = selectedSection === item.id;
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id} className="mb-1">
        <button
          className={`flex items-center w-full p-2 rounded cursor-pointer hover:bg-gray-100 ${
            isSelected ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
          }`}
          onClick={() => setSelectedSection(item.id)}
          aria-pressed={isSelected}
          type="button"
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleSection(item.id);
              }}
              className="mr-2 p-1 hover:bg-gray-200 rounded"
              aria-expanded={isExpanded}
              type="button"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
          {!hasChildren && <div className="w-6" />}
          <span className={`text-sm ${item.level === 2 ? 'ml-4' : ''}`}>
            {item.title}
          </span>
        </button>
        {hasChildren && isExpanded && (
          <div className="ml-2">
            {item.children?.map(child => renderOutlineItem(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      {/* Modular ToolBar Component */}
      <ToolBar
        toolbarOptions={toolbarOptions}
        activeToolbar={activeToolbar}
        onToggleToolbar={toggleToolbar}
        onCloseToolbar={() => setActiveToolbar(null)}
        onActionClick={handleActionClick}
      />

      {/* Document Outline Sidebar */}
      <div className="w-72 bg-white border-r border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Document</h3>
          <p className="text-sm text-gray-600 mt-1">
            {pdfFileName || 'No PDF loaded'}
          </p>
        </div>
        <div className="flex-1 p-3 overflow-y-auto max-h-screen">
          {pdfFile ? (
            documentOutline.map(item => renderOutlineItem(item))
          ) : (
            <div className="text-center text-gray-500 mt-8">
              <File size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-sm">Upload a PDF to see document structure</p>
            </div>
          )}
        </div>
      </div>

      {/* Center - PDF Viewer */}
      <div className="flex-1 flex flex-col bg-white">
        <PDFViewer
          pdfFile={pdfFile}
          pdfUrl={pdfUrl}
          pdfFileName={pdfFileName}
          isAdobeLoaded={isAdobeLoaded}
          onFileUpload={triggerFileUpload}
        />
      </div>

      {/* Right Sidebar - Chat Interface */}
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
        <Chat
          chatHistory={chatHistory}
          chatMessage={chatMessage}
          activeTab={activeTab}
          pdfFile={pdfFile}
          onMessageChange={(message) => setChatMessage(message)}
          onSendMessage={handleSendMessage}
          onTabChange={(tab) => setActiveTab(tab)}
        />
      </div>
    </div>
  );
};

export default DocumentViewer;