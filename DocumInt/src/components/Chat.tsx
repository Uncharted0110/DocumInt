import React, { useState } from 'react';
import { Send, MessageCircle, X, ChevronLeft } from 'lucide-react';

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  message: string;
}

interface ChatProps {
  chatHistory: ChatMessage[];
  chatMessage: string;
  activeTab: string;
  pdfFile: File | null;
  onMessageChange: (message: string) => void;
  onSendMessage: () => void;
  onTabChange: (tab: string) => void;
}

const Chat: React.FC<ChatProps> = ({
  chatHistory,
  chatMessage,
  activeTab,
  pdfFile,
  onMessageChange,
  onSendMessage,
  onTabChange,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Chat Container - Fixed positioned for floating effect */}
      <div
        className={`fixed top-18 right-2 z-50 bg-white rounded-lg shadow-2xl border border-gray-200 transition-transform duration-300 ease-in-out ${isOpen ? 'transform translate-x-0' : 'transform translate-x-80'
          }`}
        style={{ width: '356px', height: '625px' }}
      >
        {/* Chat Header with Toggle Button */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
          {!isOpen ? (
            <button
              onClick={toggleChat}
              className="p-1 hover:bg-white rounded-full transition-colors"
            >
              <ChevronLeft size={18} className="text-gray-500 hover:text-gray-700" />
            </button>
          ) : null}
          <h3 className="font-semibold text-gray-800 flex items-center">
            <MessageCircle size={20} className="mr-2 text-blue-600" />
            PDF Assistant
          </h3>
          <button
            onClick={toggleChat}
            className="p-1 hover:bg-white rounded-full transition-colors"
          >
            <X size={18} className="text-gray-500 hover:text-gray-700" />
          </button>
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

        {/* Chat Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4" style={{ height: 'calc(100% - 200px)' }}>
          {chatHistory.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <MessageCircle size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">Upload a PDF to start chatting</p>
            </div>
          ) : (
            chatHistory.map((chat) => (
              <div key={chat.id} className={`flex ${chat.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs p-3 rounded-lg ${chat.type === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}>
                  <p className="text-sm">{chat.message}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t border-gray-200 rounded-b-lg bg-gray-50">
          <div className="flex space-x-2">
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => onMessageChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSendMessage()}
              placeholder={
                !pdfFile
                  ? "Upload a PDF first..."
                  : activeTab === 'quick'
                    ? "Ask a quick question..."
                    : "Ask for detailed analysis..."
              }
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!pdfFile}
            />
            <button
              onClick={onSendMessage}
              disabled={!pdfFile || !chatMessage.trim()}
              className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
    </>
  );
};

export default Chat;