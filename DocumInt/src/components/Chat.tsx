import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, X } from 'lucide-react';

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  message: string;
  timestamp: Date;
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
  pdfFiles: File[];
  onMessageChange: (message: string) => void;
  onSendMessage: (message: string, results?: QueryResult[]) => void;
  onNavigateToPage?: (page: number) => void;
  projectName?: string;
  isOpen?: boolean;
  onToggle?: () => void;
}

const Chat: React.FC<ChatProps> = ({
  chatHistory,
  chatMessage,
  pdfFiles,
  onMessageChange,
  onSendMessage,
  onNavigateToPage,
  projectName,
  isOpen: externalIsOpen,
  onToggle,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [cacheKey, setCacheKey] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const lastSigRef = useRef<string>('');

  // Use external open state if provided, otherwise use internal state
  const isOpen = externalIsOpen ?? internalIsOpen;
  
  const toggleChat = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalIsOpen(prev => !prev);
    }
  };

  // Cache PDFs when they change (idempotent)
  useEffect(() => {
    if (!pdfFiles.length) return;
    const sig = [...pdfFiles.map(f => f.name + ':' + f.size)].sort((a,b)=>a.localeCompare(b)).join('|');
    if (sig === lastSigRef.current) return; // no actual change
    lastSigRef.current = sig;
    cachePDFs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfFiles]);

  const cachePDFs = async () => {
    try {
      setIsProcessing(true);
      setProcessingStatus('Uploading PDFs…');
      const formData = new FormData();
      if (projectName) formData.append('project_name', projectName);
      pdfFiles.forEach((file) => { formData.append('files', file); });
      console.log('[Chat] Calling /cache-pdfs with', pdfFiles.length, 'files for project', projectName);
      const response = await fetch('http://localhost:8000/cache-pdfs', { method: 'POST', body: formData });
      if (response.ok) {
        const data = await response.json();
        setCacheKey(data.cache_key);
        sessionStorage.setItem('cache_key', data.cache_key);
        setProcessingStatus('Processing embeddings…');
        // Poll until ready
        await pollUntilReady(data.cache_key);
      } else {
        const text = await response.text();
        console.error('Failed to cache PDFs', response.status, text);
        setProcessingStatus('Failed to cache PDFs');
      }
    } catch (error) {
      console.error('Error caching PDFs:', error);
      setProcessingStatus('Error caching PDFs');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const pollUntilReady = async (key: string) => {
    for (let i=0; i<120; i++) { // up to ~60s (0.5s * 120)
      const ready = await checkCacheStatus(key);
      if (ready) return true;
      await new Promise(r=> setTimeout(r, 500));
    }
    return false;
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
    onSendMessage(chatMessage);

    // Check if cache is ready
    const isReady = await checkCacheStatus(cacheKey);
    if (!isReady) {
      onSendMessage('PDFs are still being processed. Please wait a moment and try again.');
      return;
    }

    try {
      // Query the backend
      const formData = new FormData();
      formData.append('cache_key', cacheKey);
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
        onSendMessage(botMessage, data.subsection_analysis);
      } else {
        onSendMessage('Sorry, I encountered an error processing your query. Please try again.');
      }
    } catch (error) {
      console.error('Error querying PDFs:', error);
      onSendMessage('Sorry, I encountered an error processing your query. Please try again.');
    }
  };

  return (
    <div>
      {/* Chat Bubble FAB */}
      <button 
        onClick={toggleChat} 
        className="fixed bottom-4 right-4 z-[2147483647] w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors"
        title={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? <X size={24}/> : <MessageCircle size={28}/>}
      </button>

      {/* Chat Panel */}
      {isOpen && (
  <div className="fixed bottom-24 right-4 z-[2147483647] bg-white rounded-lg shadow-2xl border border-gray-200 w-96 h-[560px] flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-gray-200">
            <div className="font-semibold text-gray-700">Chat Assistant</div>
            <button onClick={toggleChat} className="text-gray-500 hover:text-gray-700">
              <X size={18}/>
            </button>
          </div>
          
          {/* Chat Messages */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3">
            {chatHistory.map(m => (
              <div key={m.id} className={`flex ${m.type==='user'?'justify-end':'justify-start'}`}>
                <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${m.type==='user'?'bg-blue-600 text-white':'bg-gray-100 text-gray-800'}`}>
                  <p>{m.message}</p>
                  {m.results && m.results.length>0 && (
                    <div className="mt-2 space-y-2">
                      {m.results.map((r)=> (
                        <button 
                          key={r.document + r.section_title + r.page_number} 
                          onClick={()=>onNavigateToPage && onNavigateToPage(r.page_number-1)} 
                          className="w-full text-left bg-white border rounded p-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                          type="button"
                        >
                          <div className="text-xs font-medium text-gray-700 flex justify-between">
                            <span>{r.document}</span>
                            <span>{r.importance_rank.toFixed(2)}</span>
                          </div>
                          <div className="text-[11px] text-gray-500">Page {r.page_number} • {r.section_title}</div>
                          <div className="text-[11px] text-gray-700 line-clamp-2">{r.refined_text}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Chat Input */}
          <div className="p-3 border-t border-gray-200 space-y-2">
            {isProcessing && (
              <div className="text-xs text-blue-600 mb-2 flex items-center gap-2"><span className="animate-pulse">{processingStatus || 'Processing PDFs...'}</span></div>
            )}
            <input 
              value={chatMessage} 
              onChange={e=>onMessageChange(e.target.value)} 
              onKeyDown={e=>e.key==='Enter' && handleSendMessage()} 
              placeholder={!pdfFiles.length? 'Upload PDFs first...' : 'Ask a question...'} 
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
              disabled={!pdfFiles.length || isProcessing}
            />
            <button 
              onClick={handleSendMessage} 
              disabled={!pdfFiles.length || !chatMessage.trim() || isProcessing} 
              className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center text-sm transition-colors"
            >
              <Send size={16} className="mr-1"/>
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;