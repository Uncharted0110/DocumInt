import React, { useState, useEffect } from 'react';
import { Lightbulb, Eye, Sparkles } from 'lucide-react';

interface SelectionBulbProps {
  apis: any; // Adobe loaded state or APIs
  onGenerateInsight?: (selectedText: string) => void; // optional backward compatibility
  onSearchInChat?: (selectedText: string) => void; // callback to open chat with selected text
}

const SelectionBulb: React.FC<SelectionBulbProps> = ({ apis, onGenerateInsight, onSearchInChat }) => {
  const [selectedText, setSelectedText] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [showPopover, setShowPopover] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSearchingChat, setIsSearchingChat] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to extract text from selection response
  const extractText = (selection: any): string => {
    return selection?.data || selection?.text || selection || '';
  };

  // Helper to try Adobe API selection methods
  const tryAdobeSelection = async (adobeApis: any): Promise<string> => {
    const methods = ['getSelectedContent', 'getSelection', 'getCurrentSelection'];
    
    for (const method of methods) {
      if (adobeApis[method]) {
        try {
          const selection = await adobeApis[method]();
          const text = extractText(selection);
          if (text) return text;
        } catch (e) {
          console.debug(`${method} failed`, e);
        }
      }
    }
    return '';
  };

  // Helper to get browser selection
  const getBrowserSelection = (): string => {
    const selection = window.getSelection();
    return selection?.toString().trim() || '';
  };

  // Effect to ensure bulb is hidden when no text is selected
  useEffect(() => {
    if (!isGenerating && selectedText.length < 10) {
      setIsVisible(false);
      setShowPopover(false);
    }
  }, [selectedText, isGenerating]);

  useEffect(() => {
    if (!apis) return;
    const checkSelection = async () => {
      try {
        const adobeApis = (window as any).__ADOBE_APIS__;
        let text = '';
        
        // Try Adobe APIs first
        if (adobeApis) {
          text = await tryAdobeSelection(adobeApis);
        }
        
        // Fallback to browser selection
        if (!text) {
          text = getBrowserSelection();
        }
        
        // Always update state based on current selection
        const trimmedText = text.trim();
        if (trimmedText.length >= 10) {
          // Only trigger chat search if the text actually changed
          if (trimmedText !== selectedText && !isSearchingChat && !isGenerating) {
            setSelectedText(trimmedText);
            setIsVisible(true);
            // Automatically trigger chat search
            handleSearchInChat(trimmedText);
          }
        } else {
          // Only hide if not generating or searching - but always clear selected text
          setSelectedText('');
          if (!isGenerating && !isSearchingChat) {
            setIsVisible(false);
            setShowPopover(false);
          }
        }
      } catch (e) {
        console.debug('Selection poll failed', e);
        // On error, also clear selection if not generating or searching
        if (!isGenerating && !isSearchingChat) {
          setSelectedText('');
          setIsVisible(false);
          setShowPopover(false);
        }
      }
    };
    const interval = setInterval(checkSelection, 500);
    return () => clearInterval(interval);
  }, [apis, isGenerating, isSearchingChat, selectedText]);

  const handleBulbClick = () => {
    if (!selectedText) return;
    // Show only generate insight option since chat search is automatic
    setShowPopover(p => !p);
  };

  const triggerBackendInsight = async () => {
    if (!selectedText || isGenerating) return;
    const cacheKey = sessionStorage.getItem('cache_key');
    if (!cacheKey) { setError('PDFs not cached yet.'); return; }
    setIsGenerating(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('cache_key', cacheKey);
      formData.append('persona', 'General User');
      formData.append('task', selectedText);
      formData.append('k', '6');
      formData.append('max_chunks_to_analyze', '3');
      formData.append('analysis_prompt', 'Analyze and extract key insights, facts, relationships and concise summary relevant strictly to the selected text context.');
      const res = await fetch('http://localhost:8000/analyze-chunks-with-gemini', { method: 'POST', body: formData });
      if (!res.ok) throw new Error(await res.text());
      const analysis = await res.json();
      window.dispatchEvent(new CustomEvent('documint:newInsightAnalysis', { detail: { selectedText, analysis } }));
      onGenerateInsight?.(selectedText);
      setShowPopover(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to generate insight');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSearchInChat = async (textToSearch?: string) => {
    const searchText = textToSearch || selectedText;
    if (!searchText) return;
    
    setIsSearchingChat(true);
    setError(null);
    
    try {
      // Trigger chat opening and search
      onSearchInChat?.(searchText);
    } catch (e: any) {
      setError(e?.message || 'Failed to search in chat');
    } finally {
      setIsSearchingChat(false);
    }
  };

  let buttonColorClass = '';
  if (isGenerating) {
    buttonColorClass = 'bg-blue-500 text-white animate-pulse';
  } else if (isSearchingChat) {
    buttonColorClass = 'bg-green-500 text-white animate-pulse';
  } else if (isVisible) {
    buttonColorClass = 'bg-yellow-400 text-yellow-900 hover:bg-yellow-500 animate-pulse shadow-yellow-400/50';
  } else {
    buttonColorClass = 'bg-gray-300 text-gray-600';
  }

  // Only show if we have selected text (10+ chars) or we're currently generating/searching
  const shouldShow = (isVisible && selectedText.length >= 10) || isGenerating || isSearchingChat;
  
  // Determine button title
  let buttonTitle = 'Text selected - click for options';
  if (isGenerating) {
    buttonTitle = 'Generating...';
  } else if (isSearchingChat) {
    buttonTitle = 'Searching chat...';
  }
  
  if (!shouldShow) return null;

  return (
    <>
      {/* Bulb Button with glow animation */}
      <button
        onClick={handleBulbClick}
        disabled={!selectedText || isGenerating || isSearchingChat}
        className={`fixed bottom-4 right-20 z-40 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${buttonColorClass} disabled:opacity-60`}
        title={buttonTitle}
        style={{
          boxShadow: isVisible && !isGenerating && !isSearchingChat ? '0 0 20px rgba(255, 193, 7, 0.6), 0 0 40px rgba(255, 193, 7, 0.4)' : undefined
        }}
      >
        <Lightbulb size={24} />
      </button>

      {/* Popover */}
      {showPopover && (
        <div className="fixed bottom-20 right-20 z-50 bg-white rounded-lg shadow-xl border border-gray-200 w-96 max-w-sm">
          <div className="p-4 space-y-3">
            <div className="font-semibold text-gray-800">Selected Text ({selectedText.length})</div>
            <div className="max-h-40 overflow-y-auto bg-gray-50 p-3 rounded text-sm text-gray-700 border whitespace-pre-wrap">{selectedText}</div>
            {isSearchingChat && (
              <div className="text-xs text-green-600 flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                Searching for relevant sources in chat...
              </div>
            )}
            {error && <div className="text-xs text-red-600">{error}</div>}
            <div className="flex gap-2">
              <button
                onClick={() => setShowPopover(false)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
                disabled={isGenerating}
              >
                <Eye size={16}/> Close
              </button>
              <button
                onClick={triggerBackendInsight}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60 text-sm"
                disabled={isGenerating}
              >
                <Sparkles size={16}/> {isGenerating ? 'Generating...' : 'Generate Insight'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SelectionBulb;
