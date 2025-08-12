import React, { useEffect, useMemo, useRef, useState } from 'react';
import FlippableCards, { type FlippableCardItem } from './FlippableCards';
import { Search, FileText, ListChecks, Plus, Loader2, Lightbulb } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const accentPalette = [
  { cls: 'bg-indigo-50 border-indigo-200', icon: <Lightbulb size={20} /> },
  { cls: 'bg-emerald-50 border-emerald-200', icon: <Search size={20} /> },
  { cls: 'bg-amber-50 border-amber-200', icon: <FileText size={20} /> },
  { cls: 'bg-sky-50 border-sky-200', icon: <ListChecks size={20} /> },
];

type GeminiAnalysisResponse = {
  metadata?: {
    input_documents?: string[];
    persona?: string;
    job_to_be_done?: string;
    domain?: string;
    total_chunks_found?: number;
    chunks_analyzed?: number;
    gemini_model?: string;
  };
  retrieval_results?: {
    document: string;
    section_title: string;
    page_number: number;
    hybrid_score?: number;
    content?: string;
  }[];
  gemini_analysis?: {
    document: string;
    section_title: string;
    page_number: number;
    retrieval_scores?: unknown;
    gemini_analysis?: string;
    error?: unknown;
  }[];
  summary?: {
    top_insights?: string[];
  };
};

const Insights: React.FC = () => {
  // Start with zero cards
  const seed = useMemo<FlippableCardItem[]>(() => [], []);
  const [items, setItems] = useState<FlippableCardItem[]>(seed);
  const [counter, setCounter] = useState(seed.length);

  // Keep analysis payloads to podcastify later
  const [analysisById, setAnalysisById] = useState<Record<string, GeminiAnalysisResponse | undefined>>({});
  const [podcastState, setPodcastState] = useState<Record<string, { status: 'idle' | 'loading' | 'ready' | 'error'; script?: string; error?: string }>>({});
  // Inline add form state (replaces modal)
  const [isAdding, setIsAdding] = useState(false);
  const [persona, setPersona] = useState('');
  const [job, setJob] = useState('');
  const [task, setTask] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Auto-scroll to bottom when items change
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items.length]);

  // Use same endpoint style as Chat: /cache-status/{key}
  const checkCacheStatus = async (cacheKey: string) => {
    try {
      const res = await fetch(`http://localhost:8000/cache-status/${encodeURIComponent(cacheKey)}`);
      if (!res.ok) return false;
      const data = await res.json();
      return !!data?.ready;
    } catch {
      return false;
    }
  };

  const analyzeWithGemini = async (personaVal: string, jobVal: string, taskVal: string) => {
    const geminiApiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY as string | undefined;
    // Read cache key set by Chat
    const cacheKey = sessionStorage.getItem('cache_key') || '';

    if (!personaVal.trim() || !jobVal.trim() || !taskVal.trim() || !cacheKey || !geminiApiKey) {
      console.error('Missing required fields: persona, job, task, cacheKey, or geminiApiKey');
      console.log("Key", geminiApiKey)
      console.log("Cachekey", cacheKey)
      return null;
    }

    const ready = await checkCacheStatus(cacheKey);
    if (!ready) {
      console.warn('Cache not ready yet.');
      return null;
    }

    try {
      const formData = new FormData();
      formData.append('cache_key', cacheKey);
      formData.append('persona', personaVal);
      formData.append('job_to_be_done', jobVal);
      formData.append('task', taskVal);
      formData.append('k', '5');
      formData.append('gemini_api_key', geminiApiKey);
      formData.append('max_chunks_to_analyze', '3');
      formData.append('gemini_model', 'gemini-2.5-flash');
      const defaultPrompt =
        "Analyze this document section and provide key insights, important facts, and connections to the user's task.";
      formData.append('analysis_prompt', defaultPrompt);

      const response = await fetch('http://localhost:8000/analyze-chunks-with-gemini', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) return null;
      return (await response.json()) as GeminiAnalysisResponse;
    } catch (e) {
      console.error('Network error during analysis:', e);
      return null;
    }
  };

  // Call podcastify endpoint and update card content
  const generatePodcast = async (id: string, analysis: GeminiAnalysisResponse) => {
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY as string | undefined;
    if (!apiKey) {
      setPodcastState(prev => ({ ...prev, [id]: { status: 'error', error: 'Missing API key' } }));
      setItems(prev =>
        prev.map(it =>
          it.id === id
            ? {
                ...it,
                backContent: <div className="text-xs text-red-600">Missing Gemini API key.</div>,
                backExpandedContent: <div className="text-sm text-red-600">Missing Gemini API key.</div>,
              }
            : it
        )
      );
      return;
    }

    setPodcastState(prev => ({ ...prev, [id]: { status: 'loading' } }));
    try {
      const res = await fetch('http://localhost:8000/podcastify-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis,
          gemini_api_key: apiKey,
          gemini_model: 'gemini-2.5-flash',
          style: 'engaging, educational, conversational',
          audience: 'general technical audience',
          duration_hint: '3-5 minutes',
          host_names: ['Host A', 'Host B'],
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const script: string = data.podcast_script || 'No script returned.';

      setItems(prev =>
        prev.map(it =>
          it.id === id
            ? {
                ...it,
                backContent: <pre className="text-xs text-gray-800 whitespace-pre-wrap">{script}</pre>,
                backExpandedContent: <pre className="text-sm text-gray-800 whitespace-pre-wrap">{script}</pre>,
              }
            : it
        )
      );
      setPodcastState(prev => ({ ...prev, [id]: { status: 'ready', script } }));
    } catch (err: any) {
      setPodcastState(prev => ({ ...prev, [id]: { status: 'error', error: String(err?.message || err) } }));
      setItems(prev =>
        prev.map(it =>
          it.id === id
            ? {
                ...it,
                backContent: <div className="text-xs text-red-600">Failed to generate podcast.</div>,
                backExpandedContent: <div className="text-sm text-red-600">Failed to generate podcast.</div>,
              }
            : it
        )
      );
    }
  };

  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!persona.trim() || !job.trim() || !task.trim()) return;

    setIsAnalyzing(true);
    const data = await analyzeWithGemini(persona, job, task);
    setIsAnalyzing(false);

    const idx = counter % accentPalette.length;
    const n = counter + 1;

    const topInsights = data?.summary?.top_insights || [];
    const results = data?.retrieval_results || [];
    const analyses = (data?.gemini_analysis || []).filter(a => !a.error);

    const id = crypto.randomUUID();
    const newItem: FlippableCardItem = {
      id,
      frontTitle: persona,
      frontSubtitle: job,
      frontIcon: accentPalette[idx].icon,
      accentColor: accentPalette[idx].cls,
      frontExpandedContent: (
        <div className="space-y-3 text-sm">
          {topInsights.length > 0 && (
            <div>
              <div className="font-semibold text-gray-800 mb-1">Top Insights</div>
              <ul className="list-disc ml-5 space-y-1">
                {topInsights.map((ins, i) => <li key={i}>{ins}</li>)}
              </ul>
            </div>
          )}
          {results.length > 0 && (
            <div>
              <div className="font-semibold text-gray-800 mb-1">Sources</div>
              <ul className="list-disc ml-5 space-y-1">
                {results.slice(0, 5).map((r, i) => (
                  <li key={i}>
                    <span className="font-medium">{r.document}</span>
                    {r.section_title ? ` — ${r.section_title}` : ''} (p.{r.page_number})
                  </li>
                ))}
              </ul>
            </div>
          )}
          {analyses.length > 0 && (
            <div>
              <div className="font-semibold text-gray-800 mb-1">Details</div>
              <div className="space-y-3">
                {analyses.slice(0, 3).map((a, i) => (
                  <div key={i} className="rounded border p-2 bg-gray-50">
                    <div className="text-gray-700 text-xs mb-1">
                      {a.document} — {a.section_title} (p.{a.page_number})
                    </div>
                    <div className="text-gray-800 text-sm whitespace-pre-wrap">
                      {a.gemini_analysis || 'No analysis text.'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {topInsights.length === 0 && results.length === 0 && analyses.length === 0 && (
            <div className="text-sm text-gray-600">No analysis content returned. Try again with a different task.</div>
          )}
        </div>
      ),
      // Back: start with loading placeholder; will be replaced when podcast is ready
      backContent: <div className="text-xs text-gray-600">Generating podcast…</div>,
      backExpandedContent: <div className="text-sm text-gray-600">Generating podcast…</div>,
    };

    setItems(prev => [...prev, newItem]);
    setCounter(n);
    setAnalysisById(prev => ({ ...prev, [id]: data || undefined }));

    if (data) {
      // Kick off podcast generation immediately (no flip needed)
      generatePodcast(id, data);
    } else {
      // Analysis failed; show error on back
      setPodcastState(prev => ({ ...prev, [id]: { status: 'error', error: 'No analysis returned' } }));
      setItems(prev =>
        prev.map(it =>
          it.id === id
            ? {
                ...it,
                backContent: <div className="text-xs text-red-600">Analysis failed. Cannot generate podcast.</div>,
                backExpandedContent: <div className="text-sm text-red-600">Analysis failed. Cannot generate podcast.</div>,
              }
            : it
        )
      );
    }

    setIsAdding(false);
    setPersona('');
    setJob('');
    setTask('');
  };

  // Flip handler: call podcastify on first flip
  const handleFlip = (id: string, flipped: boolean) => {
    if (!flipped) return;
    const state = podcastState[id]?.status || 'idle';
    if (state === 'idle') {
      // show loading message immediately
      setItems(prev =>
        prev.map(it =>
          it.id === id
            ? {
                ...it,
                backContent: <div className="text-xs text-gray-600">Generating podcast…</div>,
                backExpandedContent: <div className="text-sm text-gray-600">Generating podcast…</div>,
              }
            : it
        )
      );
      if (analysisById[id]) {
        generatePodcast(id, analysisById[id]!);
      }
    }
  };

  // Handler to view mind map for a given analysis
  const handleViewMindMap = (analysis: GeminiAnalysisResponse | undefined) => {
    if (!analysis) return;
    const persona = analysis.metadata?.persona || 'Persona';
    // Use retrieval_results for actual chunk content
    const chunks = (analysis.retrieval_results || []).map(
      (chunk) => chunk.content || chunk.section_title || 'No content'
    );
    navigate('/mindmap', { state: { insightsData: { persona, chunks } } });
  };

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-semibold text-gray-700">Insights</div>
      </div>
      <div ref={scrollRef} className="max-h-155 overflow-y-auto pr-1">
        <div className="flex flex-col gap-3">
          {items.map((item, idx) => (
            <div key={item.id} className="insight-card">
              {/* ...existing card content... */}
              <button
                onClick={() => handleViewMindMap(analysisById[item.id])}
                style={{ marginTop: '10px', padding: '8px 16px', background: '#6b7280', color: '#fff', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
              >
                View Mind Map
              </button>
            </div>
          ))}
          <FlippableCards
            items={items}
            className=""
            collapsedHeightClass="h-28"
            expandedHeightClass="h-155"
          />

          {!isAdding ? (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              disabled={isAnalyzing}
              className="h-28 w-full rounded-lg border-2 border-dashed border-gray-300 bg-white hover:border-indigo-300 hover:bg-indigo-50/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400 transition-colors flex items-center justify-center text-sm text-gray-600 shadow-sm disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-2">
                {isAnalyzing ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                {isAnalyzing ? 'Analyzing…' : 'Add insight'}
              </span>
            </button>
          ) : (
            <form
              onSubmit={handleSubmitAdd}
              className="w-full rounded-lg border bg-white p-3 shadow-sm"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Persona</label>
                  <input
                    className="w-full rounded border px-2 py-1 text-sm"
                    value={persona}
                    onChange={(e) => setPersona(e.target.value)}
                    placeholder="e.g., QA Engineer"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Job</label>
                  <input
                    className="w-full rounded border px-2 py-1 text-sm"
                    value={job}
                    onChange={(e) => setJob(e.target.value)}
                    placeholder="e.g., Validate requirements"
                    required
                  />
                </div>
                <div className="md:col-span-1" />
                <div className="md:col-span-3">
                  <label className="block text-xs text-gray-600 mb-1">Task / Prompt</label>
                  <textarea
                    className="w-full rounded border px-2 py-1 text-sm min-h-20"
                    value={task}
                    onChange={(e) => setTask(e.target.value)}
                    placeholder="Describe the analysis you want"
                    required
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!isAnalyzing) {
                      setIsAdding(false);
                      setPersona('');
                      setJob('');
                      setTask('');
                    }
                  }}
                  className="px-3 py-1.5 text-sm rounded border bg-white hover:bg-gray-50"
                  disabled={isAnalyzing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-sm rounded border bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? 'Analyzing…' : 'Create'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Insights;