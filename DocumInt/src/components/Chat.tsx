import React, { useState, useEffect, useRef } from 'react';
import { X, Cable } from 'lucide-react';
import { API_ENDPOINTS } from '../config/api';

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
  onNavigateToPage?: (page: number) => void;
  onNavigateToSource?: (params: { fileName: string; page: number; searchText?: string }) => void;
  projectName?: string;
  isOpen?: boolean;
  onToggle?: () => void;
}

const Chat: React.FC<ChatProps> = ({
  chatHistory,
  pdfFiles,
  onNavigateToPage,
  onNavigateToSource,
  projectName,
  isOpen: externalIsOpen,
  onToggle,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [, setCacheKey] = useState<string | null>(null);
  const [, setIsProcessing] = useState(false);
  const [, setProcessingStatus] = useState<string>('');
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
      const response = await fetch(API_ENDPOINTS.CACHE_PDFS, { method: 'POST', body: formData });
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
      const response = await fetch(API_ENDPOINTS.CACHE_STATUS(key));
      if (response.ok) {
        const data = await response.json();
        return data.ready;
      }
    } catch (error) {
      console.error('Error checking cache status:', error);
    }
    return false;
  };

  return (
    <div>
      {/* Chat Bubble FAB */}
      <button 
        onClick={toggleChat} 
        className="fixed bottom-4 right-4 z-[2147483647] w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors"
        title={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? <X size={24}/> : <Cable size={28}/>}
      </button>

      {/* Chat Panel */}
      {isOpen && (
  <div className="fixed bottom-24 right-4 z-[2147483647] bg-white rounded-lg shadow-2xl border border-gray-200 w-96 h-[560px] flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-gray-200">
            <div className="font-semibold text-gray-700">Connecting the Dots</div>
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
                          onClick={() => {
                            if (onNavigateToSource) {
                              onNavigateToSource({
                                fileName: r.document,
                                page: r.page_number,
                                searchText: r.section_title // highlight section title after navigation
                              });
                            } else if (onNavigateToPage) {
                              onNavigateToPage(r.page_number - 1);
                            }
                          }}
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
        </div>
      )}
    </div>
  );
};

export default Chat;