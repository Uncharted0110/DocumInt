import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Send,
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
  AlertCircle
} from 'lucide-react';
import ToolBar from './components/ToolBar';
import PDFViewer from './components/PDFViewer';

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
  const [chatHistory, setChatHistory] = useState([
    { id: crypto.randomUUID(), type: 'bot', message: 'Hello! Upload a PDF to get started, then I can help you analyze it!' }
  ]);
  
  // PDF-related state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState('');
  const [isAdobeLoaded, setIsAdobeLoaded] = useState(false);
  const [pdfViewer, setPdfViewer] = useState(null);
  const pdfViewerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Adobe PDF Embed API configuration
  const ADOBE_API_KEY = import.meta.env.VITE_ADOBE_API_KEY;
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

  // Initialize Adobe PDF viewer when API is loaded and PDF is available
  useEffect(() => {
    if (isAdobeLoaded && pdfUrl && pdfFileName) {
      initializePDFViewer();
    }
  }, [isAdobeLoaded, pdfUrl, pdfFileName]);

  const initializePDFViewer = () => {
    if (!window.AdobeDC || !pdfViewerRef.current) return;

    // Clear previous viewer
    if (pdfViewer) {
      pdfViewerRef.current.innerHTML = '';
    }

    const adobeDCView = new window.AdobeDC.View({
      clientId: ADOBE_API_KEY,
      divId: "adobe-dc-view"
    });

    adobeDCView.previewFile({
      content: { location: { url: pdfUrl } },
      metaData: { fileName: pdfFileName }
    }, {
      embedMode: "SIZED_CONTAINER",
      showAnnotationTools: true,
      showLeftHandPanel: true,
      showBookmarks: true,
      showThumbnails: true,
      showDownloadPDF: true,
      showPrintPDF: true,
      showZoomControl: true,
      showPageControls: true,
      showSearchControl: true,
      enableFormFilling: true,
      enableRedaction: false,
      defaultViewMode: "FIT_PAGE",
      showDisabledSaveButton: false,
      exitPDFViewerType: "CLOSE"
    });

    setPdfViewer(adobeDCView);
  };

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

      // Update chat history
      setChatHistory(prev => [...prev, 
        { id: crypto.randomUUID(), type: 'user', message: `Uploaded: ${file.name}` },
        { id: crypto.randomUUID(), type: 'bot', message: `Great! I've loaded "${file.name}". You can now ask me questions about this document.` }
      ]);
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

  const handleActionClick = (actionId: string, toolId: string) => {
    switch(actionId) {
      case 'add-pdf':
        triggerFileUpload();
        break;
      case 'delete-pdf':
        setPdfFile(null);
        setPdfUrl(null);
        setPdfFileName('');
        if (pdfViewerRef.current) {
          pdfViewerRef.current.innerHTML = '';
        }
        setChatHistory(prev => [...prev, 
          { id: crypto.randomUUID(), type: 'bot', message: 'PDF removed. Upload a new PDF to continue.' }
        ]);
        break;
      case 'download-pdf':
        if (pdfFile) {
          const url = URL.createObjectURL(pdfFile);
          const a = document.createElement('a');
          a.href = url;
          a.download = pdfFileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
        break;
      default:
        console.log(`Action ${actionId} clicked for tool ${toolId}`);
    }
    setActiveToolbar(null); 
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
    if (chatMessage.trim()) {
      const newUserMessage = { id: crypto.randomUUID(), type: 'user', message: chatMessage };
      let botResponse;
      
      if (!pdfFile) {
        botResponse = { 
          id: crypto.randomUUID(),
          type: 'bot', 
          message: 'Please upload a PDF first so I can analyze it for you!'
        };
      } else {
        botResponse = { 
          id: crypto.randomUUID(),
          type: 'bot', 
          message: (() => {
            let quickAnswer = chatMessage.includes('summary')
              ? 'I can see your document is loaded. For a complete analysis, I would need to process the content.'
              : 'I can help you with that specific query about your document.';
            let detailedAnswer = chatMessage.toLowerCase().includes('what')
              ? 'This appears to be your uploaded PDF document. I can provide comprehensive insights once integrated with content analysis.'
              : 'I can provide detailed insights about this document.';
            return activeTab === 'quick'
              ? `Quick answer about "${pdfFileName}": ${quickAnswer}`
              : `Detailed analysis of "${pdfFileName}": ${detailedAnswer}`;
          })()
        };
      }
      
      setChatHistory(prev => [...prev, newUserMessage, botResponse]);
      setChatMessage('');
    }
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
          {!pdfFile && (
            <button
              onClick={triggerFileUpload}
              className="mt-2 flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
            >
              <Upload size={14} className="mr-1" />
              Upload PDF
            </button>
          )}
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
        {/* Chat Tabs */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('quick')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'quick'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Quick Query
            </button>
            <button
              onClick={() => setActiveTab('detailed')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'detailed'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Detailed
            </button>
          </div>
        {/* Chat Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {chatHistory.map((chat) => (
            <div key={chat.id} className={`flex ${chat.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs p-3 rounded-lg ${
                chat.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                <p className="text-sm">{chat.message}</p>
              </div>
            </div>
          ))}
        </div>
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex space-x-2">
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={
                !pdfFile 
                  ? "Upload a PDF first..." 
                  : activeTab === 'quick' 
                    ? "Ask a quick question..." 
                    : "Ask for detailed analysis..."
              }
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!pdfFile}
            />
            <button
              onClick={handleSendMessage}
              disabled={!pdfFile || !chatMessage.trim()}
              className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {!pdfFile 
              ? 'Upload a PDF to start chatting' 
              : activeTab === 'quick' 
                ? 'Get instant answers' 
                : 'Get comprehensive analysis'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;