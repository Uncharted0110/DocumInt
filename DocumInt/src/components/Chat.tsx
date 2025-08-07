import React from 'react';
import { Send } from 'lucide-react';

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
  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col">
      {/* Chat Tabs */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => onTabChange('quick')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'quick'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Quick Query
          </button>
          <button
            onClick={() => onTabChange('detailed')}
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

      {/* Chat Input */}
      <div className="p-4 border-t border-gray-200">
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
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!pdfFile}
          />
          <button
            onClick={onSendMessage}
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
  );
};

export default Chat;