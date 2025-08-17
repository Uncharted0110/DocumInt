import React, { useState, useEffect } from 'react';
import { Lightbulb, Eye, Sparkles } from 'lucide-react';

interface SelectionBulbProps {
  apis: any;
  onGenerateInsight?: (selectedText: string) => void; // optional backward compatibility
}

const SelectionBulb: React.FC<SelectionBulbProps> = ({ apis: _apis, onGenerateInsight }) => {
  const [selectedText, setSelectedText] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [showPopover, setShowPopover] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSelection = async () => {
      try {
        const selection = await (window as any).__ADOBE_APIS__?.getSelectedContent?.();
        const text = selection?.data || '';
        if (text.trim().length >= 10) {
          setSelectedText(text.trim());
          setIsVisible(true);
        } else if (!isGenerating) {
          setSelectedText('');
          setIsVisible(false);
          setShowPopover(false);
        }
      } catch (e) {
        console.debug('Selection poll failed', e);
      }
    };
    const interval = setInterval(checkSelection, 500);
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleBulbClick = () => {
    if (!selectedText) return;
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

  let buttonColorClass = '';
  if (isGenerating) {
    buttonColorClass = 'bg-blue-500 text-white animate-pulse';
  } else if (isVisible) {
    buttonColorClass = 'bg-yellow-400 text-yellow-900 hover:bg-yellow-500';
  } else {
    buttonColorClass = 'bg-gray-300 text-gray-600';
  }

  if (!isVisible && !isGenerating) return null;

  return (
    <>
      {/* Bulb Button */}
      <button
        onClick={handleBulbClick}
        disabled={!selectedText || isGenerating}
  className={`fixed bottom-6 right-28 z-[2147483647] w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${buttonColorClass} disabled:opacity-60`}
        title={isGenerating ? 'Generating...' : 'Text selected - click for options'}
      >
        <Lightbulb size={24} />
      </button>

      {/* Popover */}
      {showPopover && (
  <div className="fixed bottom-24 right-28 z-[2147483647] bg-white rounded-lg shadow-xl border border-gray-200 w-96 max-w-sm">
          <div className="p-4 space-y-3">
            <div className="font-semibold text-gray-800">Selected Text ({selectedText.length})</div>
            <div className="max-h-40 overflow-y-auto bg-gray-50 p-3 rounded text-sm text-gray-700 border whitespace-pre-wrap">{selectedText}</div>
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
