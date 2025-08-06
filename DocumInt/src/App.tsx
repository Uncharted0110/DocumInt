import React, { useState } from 'react';
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
  Send,
  Eye,
  Copy,
  X
} from 'lucide-react';

const DocumentViewer = () => {
  const [activeToolbar, setActiveToolbar] = useState(null);
  const [selectedSection, setSelectedSection] = useState('1');
  const [expandedSections, setExpandedSections] = useState(['1', '2']);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('quick');
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { type: 'bot', message: 'Hello! I can help you analyze this document. What would you like to know?' }
  ]);

  const toolbarOptions = [
    {
      id: 'pdf',
      title: 'PDF',
      icon: <FileText size={20} />,
      actions: [
        { id: 'add-pdf', icon: <Plus size={18} />, title: 'Add PDF', desc: 'Upload new PDF' },
        { id: 'delete-pdf', icon: <Trash2 size={18} />, title: 'Delete PDF', desc: 'Remove current PDF' },
        { id: 'edit-pdf', icon: <Edit3 size={18} />, title: 'Edit PDF', desc: 'Modify PDF content' },
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
    }
  ];

  const documentOutline = [
    {
      id: '1',
      title: 'Introduction',
      level: 1,
      children: [
        { id: '1.1', title: 'Overview', level: 2 },
        { id: '1.2', title: 'Objectives', level: 2 }
      ]
    },
    {
      id: '2',
      title: 'Methodology',
      level: 1,
      children: [
        { id: '2.1', title: 'Data Collection', level: 2 },
        { id: '2.2', title: 'Analysis Framework', level: 2 }
      ]
    },
    {
      id: '3',
      title: 'Results',
      level: 1,
      children: []
    },
    {
      id: '4',
      title: 'Conclusion',
      level: 1,
      children: []
    }
  ];

  const toggleToolbar = (toolId) => {
    setActiveToolbar(activeToolbar === toolId ? null : toolId);
  };

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      const newUserMessage = { type: 'user', message: chatMessage };
      const botResponse = { 
        type: 'bot', 
        message: activeTab === 'quick' 
          ? `Quick answer: ${chatMessage.includes('summary') ? 'This document covers methodology and results analysis.' : 'I can help you with that specific query.'}`
          : `Detailed analysis: Based on the document content, ${chatMessage.toLowerCase().includes('what') ? 'this appears to be a research paper discussing various methodological approaches and their outcomes.' : 'I can provide comprehensive insights about this topic.'}`
      };
      
      setChatHistory(prev => [...prev, newUserMessage, botResponse]);
      setChatMessage('');
    }
  };

  const renderOutlineItem = (item) => {
    const isExpanded = expandedSections.includes(item.id);
    const isSelected = selectedSection === item.id;
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id} className="mb-1">
        <div 
          className={`flex items-center p-2 rounded cursor-pointer hover:bg-gray-100 ${
            isSelected ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
          }`}
          onClick={() => setSelectedSection(item.id)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleSection(item.id);
              }}
              className="mr-2 p-1 hover:bg-gray-200 rounded"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
          {!hasChildren && <div className="w-6" />}
          <span className={`text-sm ${item.level === 2 ? 'ml-4' : ''}`}>
            {item.id} {item.title}
          </span>
        </div>
        {hasChildren && isExpanded && (
          <div className="ml-2">
            {item.children.map(child => renderOutlineItem(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Minimized Toolbar - Far Left */}
      <div className="w-16 bg-gray-800 flex flex-col items-center py-4 space-y-2">
        {toolbarOptions.map(tool => (
          <button
            key={tool.id}
            onClick={() => toggleToolbar(tool.id)}
            className={`p-3 rounded-lg transition-all duration-200 ${
              activeToolbar === tool.id
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
            title={tool.title}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      {/* Expandable Tool Sidebar */}
      {activeToolbar && (
        <div className="w-80 bg-white border-r border-gray-200 shadow-lg">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">
              {toolbarOptions.find(t => t.id === activeToolbar)?.title} Tools
            </h3>
            <button
              onClick={() => setActiveToolbar(null)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <X size={16} />
            </button>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {toolbarOptions
                .find(t => t.id === activeToolbar)
                ?.actions.map(action => (
                <button
                  key={action.id}
                  className="w-full flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="text-blue-600 mr-4">{action.icon}</div>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-gray-800">{action.title}</div>
                    <div className="text-sm text-gray-600">{action.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Document Outline Sidebar */}
      <div className="w-72 bg-white border-r border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Document Outline</h3>
          <p className="text-sm text-gray-600 mt-1">Research Paper - Analysis.pdf</p>
        </div>
        <div className="flex-1 p-3 overflow-y-auto max-h-screen">
          {documentOutline.map(item => renderOutlineItem(item))}
        </div>
      </div>

      {/* Center - PDF Viewer */}
      <div className="flex-1 flex flex-col bg-white">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText size={20} className="text-gray-600" />
            <h1 className="text-xl font-semibold text-gray-800">Research Paper - Analysis.pdf</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">Page {currentPage} of 30</span>
            <div className="flex space-x-2">
              <button 
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                className="px-3 py-1 text-sm bg-gray-100 border border-gray-300 rounded hover:bg-gray-200"
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrentPage(Math.min(30, currentPage + 1))}
                className="px-3 py-1 text-sm bg-gray-100 border border-gray-300 rounded hover:bg-gray-200"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto bg-gray-100">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg border border-gray-300 p-12 min-h-[800px]">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-4">Research Analysis Report</h1>
                <p className="text-gray-600">A Comprehensive Study on Modern Methodologies</p>
              </div>

              <div className="prose prose-lg max-w-none">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                  {documentOutline
                    .flatMap(item => [item, ...(item.children || [])])
                    .find(item => item.id === selectedSection)?.title}
                </h2>
                
                <p className="text-gray-700 leading-relaxed mb-6">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                </p>

                <p className="text-gray-700 leading-relaxed mb-6">
                  Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                </p>

                <div className="bg-gray-50 p-6 rounded-lg mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Key Findings</h3>
                  <ul className="text-gray-700 space-y-2">
                    <li>• Methodology shows 85% accuracy in results</li>
                    <li>• Data collection spans over 12 months</li>
                    <li>• Analysis framework provides robust insights</li>
                  </ul>
                </div>

                <p className="text-gray-700 leading-relaxed">
                  Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
                </p>
              </div>
            </div>
          </div>
        </div>
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
        </div>

        {/* Chat Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {chatHistory.map((chat, index) => (
            <div key={index} className={`flex ${chat.type === 'user' ? 'justify-end' : 'justify-start'}`}>
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

        {/* Chat Input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex space-x-2">
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={activeTab === 'quick' ? "Ask a quick question..." : "Ask for detailed analysis..."}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSendMessage}
              className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Send size={16} />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {activeTab === 'quick' ? 'Get instant answers' : 'Get comprehensive analysis'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;