import React, { useState, useEffect } from 'react';
import { Send, MessageCircle, X, ChevronUp, Star, Clock, User, Target } from 'lucide-react';

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  message: string;
  timestamp: Date;
  persona?: string;
  task?: string;
  results?: QueryResult[];
}

interface QueryResult {
  document: string;
  section_title: string;
  refined_text: string;
  page_number: number;
  importance_rank: number;
  bm25_score: number;
  embedding_score: number;
}

interface ChatProps {
  chatHistory: ChatMessage[];
  chatMessage: string;
  activeTab: string;
  pdfFiles: File[];
  initialPersona?: string;
  initialTask?: string;
  onMessageChange: (message: string) => void;
  onSendMessage: (message: string, persona?: string, task?: string, results?: QueryResult[]) => void;
  onTabChange: (tab: string) => void;
  onNavigateToPage?: (page: number) => void;
}

const Chat: React.FC<ChatProps> = ({
  chatHistory,
  chatMessage,
  activeTab,
  pdfFiles,
  initialPersona,
  initialTask,
  onMessageChange,
  onSendMessage,
  onTabChange,
  onNavigateToPage,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [cacheKey, setCacheKey] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [persona, setPersona] = useState(initialPersona || '');
  const [task, setTask] = useState(initialTask || '');

  // Cache PDFs when they change
  useEffect(() => {
    if (pdfFiles.length > 0) {
      cachePDFs();
    }
  }, [pdfFiles]);

  const cachePDFs = async () => {
    try {
      setIsProcessing(true);
      const formData = new FormData();
      
      pdfFiles.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('http://localhost:8000/cache-pdfs', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setCacheKey(data.cache_key);
        sessionStorage.setItem('cache_key', data.cache_key)
        console.log('PDFs cached successfully:', data);
      } else {
        console.error('Failed to cache PDFs');
      }
    } catch (error) {
      console.error('Error caching PDFs:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const checkCacheStatus = async (key: string) => {
    try {
      const response = await fetch(`http://localhost:8000/cache-status/${key}`);
      if (response.ok) {
        const data = await response.json();
        return data.ready;
      }
    } catch (error) {
      console.error('Error checking cache status:', error);
    }
    return false;
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !cacheKey) return;

    // Send user message
    onSendMessage(chatMessage, persona, task);

    // Check if cache is ready
    const isReady = await checkCacheStatus(cacheKey);
    if (!isReady) {
      // Add error message to chat
      onSendMessage('PDFs are still being processed. Please wait a moment and try again.', '', '');
      return;
    }

    try {
      // Query the backend
      const formData = new FormData();
      formData.append('cache_key', cacheKey);
      formData.append('persona', persona || 'General User');
      formData.append('task', chatMessage);
      formData.append('k', '5');

      const response = await fetch('http://localhost:8000/query-pdfs', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        
        // Send bot response with results
        const botMessage = `Found ${data.subsection_analysis.length} relevant sections from your PDFs.`;
        onSendMessage(botMessage, '', '', data.subsection_analysis);
      } else {
        onSendMessage('Sorry, I encountered an error processing your query. Please try again.', '', '');
      }
    } catch (error) {
      console.error('Error querying PDFs:', error);
      onSendMessage('Sorry, I encountered an error processing your query. Please try again.', '', '');
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const handleResultClick = (result: QueryResult) => {
    if (onNavigateToPage) {
      onNavigateToPage(result.page_number - 1); // Convert to 0-based index
    }
  };

  return (
    <>
      {/* Chat Container - Fixed positioned for floating effect */}
      <div
        className={`fixed top-100 right-3 z-50 bg-white rounded-lg shadow-2xl border border-gray-200 transition-transform duration-300 ease-in-out ${isOpen ? 'transform -translate-y-80' : 'transform translate-y-70'
          }`}
        style={{ width: '356px', height: '565px' }}
      >
        {/* Chat Header with Toggle Button */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
          
          <h3 className="font-semibold text-gray-800 flex items-center">
            <MessageCircle size={20} className="mr-2 text-blue-600" />
            PDF Assistant
          </h3>
          {!isOpen ? (
            <button
              onClick={toggleChat}
              className="p-1 hover:bg-white rounded-full transition-colors"
            >
              <ChevronUp size={18} className="text-gray-500 hover:text-gray-700" />
            </button>
          ) : <button
            onClick={toggleChat}
            className="p-1 hover:bg-white rounded-full transition-colors"
          >
            <X size={18} className="text-gray-500 hover:text-gray-700" />
          </button>}
          
          
        </div>

        {/* Chat Tabs */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => onTabChange('quick')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'quick'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
                }`}
            >
              Quick Query
            </button>
            <button
              onClick={() => onTabChange('detailed')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'detailed'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
                }`}
            >
              Detailed
            </button>
          </div>
        </div>

        {/* Processing Status */}
        {isProcessing && (
          <div className="p-4 border-b border-gray-200 bg-yellow-50">
            <div className="flex items-center text-yellow-800">
              <Clock size={16} className="mr-2 animate-spin" />
              <span className="text-sm">Processing PDFs...</span>
            </div>
          </div>
        )}

        {/* Chat Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4" style={{ height: 'calc(100% - 200px)' }}>
          {chatHistory.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <MessageCircle size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">Upload PDFs to start chatting</p>
            </div>
          ) : (
            chatHistory.map((chat) => (
              <div key={chat.id} className={`flex ${chat.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs p-3 rounded-lg ${chat.type === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}>
                  <p className="text-sm">{chat.message}</p>
                  
                  {/* Display results if available */}
                  {chat.results && chat.results.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {chat.results.map((result, index) => (
                        <div
                          key={index}
                          onClick={() => handleResultClick(result)}
                          className="bg-white p-2 rounded border cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-700">
                              {result.document}
                            </span>
                            <div className="flex items-center space-x-1">
                              <Star size={10} className="text-yellow-500" />
                              <span className="text-xs text-gray-500">
                                {result.importance_rank.toFixed(2)}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 mb-1">
                            Page {result.page_number} • {result.section_title}
                          </p>
                          <p className="text-xs text-gray-800 line-clamp-2">
                            {result.refined_text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t border-gray-200 rounded-b-lg bg-gray-50">
          {/* Persona and Task Input for Quick Query */}
          {activeTab === 'quick' && (
            <div className="mb-3 space-y-2">
              <div className="flex space-x-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    <User size={10} className="inline mr-1" />
                    Persona
                  </label>
                  <input
                    type="text"
                    value={persona}
                    onChange={(e) => setPersona(e.target.value)}
                    placeholder="e.g., Travel Planner"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    <Target size={10} className="inline mr-1" />
                    Task
                  </label>
                  <input
                    type="text"
                    value={task}
                    onChange={(e) => setTask(e.target.value)}
                    placeholder="e.g., Find restaurants"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}
          
          <div className="flex space-x-2">
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => onMessageChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={
                !pdfFiles.length
                  ? "Upload PDFs first..."
                  : activeTab === 'quick'
                    ? "Ask a question with persona-based search..."
                    : "Ask for detailed analysis..."
              }
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!pdfFiles.length || isProcessing}
            />
            <button
              onClick={handleSendMessage}
              disabled={!pdfFiles.length || !chatMessage.trim() || isProcessing}
              className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {!pdfFiles.length
              ? 'Upload PDFs to start chatting'
              : activeTab === 'quick'
                ? 'Use persona and task for better results'
                : 'Get comprehensive analysis'
            }
          </p>
        </div>
      </div>
    </>
  );
};

export default Chat;