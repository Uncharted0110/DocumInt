import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Lightbulb, Loader2, Sparkles } from 'lucide-react';
import FlippableCards, { type FlippableCardItem } from './FlippableCards';
import { updateProjectInsights, loadProject, type ProjectInsightPersist } from '../utils/projectStorage';
import { useMindmap } from '../contexts/MindmapContext';

interface GeminiAnalysisResp { metadata?: any; retrieval_results?: any[]; gemini_analysis?: any[]; summary?: { top_insights?: string[] }; selected_text?: string; insight_id?: string; }
interface InsightsProps { projectName?: string; onNavigateToPage?: (page: number, text?: string) => void; }

const palette = ['bg-indigo-50 border-indigo-200','bg-emerald-50 border-emerald-200','bg-amber-50 border-amber-200','bg-sky-50 border-sky-200'];

const Insights: React.FC<InsightsProps> = ({ projectName, onNavigateToPage }) => {
  const [items, setItems] = useState<FlippableCardItem[]>([]);
  const [analysisById, setAnalysisById] = useState<Record<string, GeminiAnalysisResp>>({});
  const [podcastStatus, setPodcastStatus] = useState<Record<string, { state: 'idle'|'loading'|'ready'|'error'; audioUrl?: string }>>({});
  const counterRef = useRef(0);
  const { updateMindmap } = useMindmap();

  // Load persisted insights (basic)
  useEffect(() => {
    (async () => {
      if (!projectName) return;
      const loaded = await loadProject(projectName);
      if (!loaded?.insights) return;
      const restored: FlippableCardItem[] = loaded.insights.map((p,i) => ({
        id: p.id,
        frontTitle: p.task.slice(0,60)+(p.task.length>60?'…':''),
        accentColor: p.accentColor || palette[i % palette.length],
        frontExpandedContent: <div className="text-sm text-gray-600">(Persisted insight – open new selection to analyze)</div>,
        backContent: <div className="text-xs text-gray-500">Flip to generate podcast.</div>,
        backExpandedContent: <div className="text-sm text-gray-500">Flip to generate podcast.</div>
      }));
      counterRef.current = restored.length;
      setItems(restored);
      const analyses: Record<string, any> = {};
      loaded.insights.forEach(p => { if (p.analysis) analyses[p.id] = p.analysis; });
      setAnalysisById(analyses);
    })();
  }, [projectName]);

  // Persist
  useEffect(() => {
    if (!projectName) return;
    const persist: ProjectInsightPersist[] = items.map(it => ({ id: it.id, task: it.frontTitle, accentColor: it.accentColor, analysis: analysisById[it.id], createdAt: new Date().toISOString() }));
    updateProjectInsights(projectName, persist);
  }, [items, analysisById, projectName]);

  const buildMindmap = useCallback((selected: string, analysis: GeminiAnalysisResp) => {
    const insights = (analysis.gemini_analysis || []).filter(a=>!a.error);
    const sources = analysis.retrieval_results || [];
    updateMindmap(selected, insights, sources);
  }, [updateMindmap]);

  const buildFrontExpanded = useCallback((selected: string, analysis: GeminiAnalysisResp) => {
    const top = analysis.summary?.top_insights || [];
    const retrieval = analysis.retrieval_results || [];
    const details = (analysis.gemini_analysis || []).filter(a=>!a.error);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm"><Sparkles size={14}/> Generated Insight</div>
        {top.length>0 && <div><div className="text-xs font-semibold text-gray-700 mb-1">Top Points</div><ul className="list-disc ml-4 text-xs space-y-1">{top.map(t=> <li key={t.slice(0,50)}>{t}</li>)}</ul></div>}
        {retrieval.length>0 && <div><div className="text-xs font-semibold text-gray-700 mb-1">Sources</div><ul className="text-[11px] space-y-1">{retrieval.slice(0,5).map(r=>{ const key=`${r.document}_${r.section_title}_${r.page_number}`; return <li key={key}><button type="button" onClick={(e)=>{ e.stopPropagation(); onNavigateToPage?.(r.page_number-1, r.section_title); }} className="underline text-blue-600 hover:text-blue-800">{r.document}{r.section_title?` • ${r.section_title}`:''} (p.{r.page_number})</button></li>; })}</ul></div>}
        {details.length>0 && <div className="space-y-2"><div className="text-xs font-semibold text-gray-700">Details</div>{details.slice(0,3).map((d,i)=>{ const key=`det_${i}`; return <div key={key} className="border rounded p-2 bg-gray-50"><div className="text-[11px] text-gray-500 mb-1">{d.document} • {d.section_title} (p.{d.page_number})</div><div className="text-xs whitespace-pre-wrap leading-snug">{(d.gemini_analysis||'').slice(0,800)}</div></div>; })}</div>}
        <div><button type="button" onClick={(e)=>{ e.stopPropagation(); buildMindmap(selected, analysis); }} className="px-2 py-1 text-[11px] rounded bg-purple-600 text-white hover:bg-purple-700">View Mindmap</button></div>
      </div>
    );
  }, [onNavigateToPage, buildMindmap]);

  // Listen to SelectionBulb event
  useEffect(() => {
    const handler = (e: Event) => {
      const detail: any = (e as CustomEvent).detail;
      if (!detail) return;
      const { selectedText, analysis } = detail;
      const accent = palette[counterRef.current % palette.length];
      const id = analysis.insight_id || crypto.randomUUID();
      counterRef.current += 1;
      const newItem: FlippableCardItem = {
        id,
        frontTitle: selectedText.slice(0,60)+(selectedText.length>60?'…':''),
        accentColor: accent,
        frontExpandedContent: buildFrontExpanded(selectedText, analysis),
        backContent: <div className="text-xs text-gray-600 flex items-center gap-2"><Loader2 size={12} className="animate-spin"/>Flip to generate podcast</div>,
        backExpandedContent: <div className="text-sm text-gray-600">Flip to generate podcast audio.</div>
      };
      setItems(prev => [...prev, newItem]);
      setAnalysisById(prev => ({ ...prev, [id]: analysis }));
      setPodcastStatus(prev => ({ ...prev, [id]: { state: 'idle' } }));
    };
    window.addEventListener('documint:newInsightAnalysis', handler as EventListener);
    return () => window.removeEventListener('documint:newInsightAnalysis', handler as EventListener);
  }, [buildFrontExpanded]);

  const genPodcast = async (id: string) => {
    const analysis = analysisById[id];
    if (!analysis || podcastStatus[id]?.state !== 'idle' || !projectName) return;
    setPodcastStatus(p => ({ ...p, [id]: { state: 'loading' } }));
    setItems(prev => prev.map(it => it.id===id ? { ...it, backContent: <div className="text-xs text-gray-600 flex items-center gap-2"><Loader2 size={12} className="animate-spin"/>Generating podcast…</div>, backExpandedContent: <div className="text-sm text-gray-600">Generating podcast…</div> } : it));
    try {
      const resp = await fetch('http://localhost:8000/generate-podcast', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ project_name: analysis.metadata?.project_name || projectName, insight_id: analysis.insight_id }) });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      const audioUrl = `http://localhost:8000${data.audio_url}`;
      setItems(prev => prev.map(it => it.id===id ? { ...it, backContent: audioEl(audioUrl), backExpandedContent: audioEl(audioUrl) } : it));
      setPodcastStatus(p => ({ ...p, [id]: { state: 'ready', audioUrl } }));
    } catch (e) {
      console.debug('Podcast generation failed', e);
      setItems(prev => prev.map(it => it.id===id ? { ...it, backContent: <div className="text-xs text-red-600">Podcast failed.</div>, backExpandedContent: <div className="text-sm text-red-600">Podcast failed.</div> } : it));
      setPodcastStatus(p => ({ ...p, [id]: { state: 'error' } }));
    }
  };

  const handleFlip = (id: string, flipped: boolean) => {
    if (flipped) genPodcast(id);
  };

  const audioEl = (src: string) => (
    <div className="w-full">
      <audio controls className="w-full" src={src}><track kind="captions"/></audio>
      <div className="mt-1 text-[11px] text-gray-500">Podcast ready</div>
    </div>
  );

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between"><div className="font-semibold text-gray-700 flex items-center gap-2"><Lightbulb size={16}/> Insights</div><div className="text-xs text-gray-500">{items.length} total</div></div>
      {items.length===0 && <div className="p-4 border rounded bg-white text-xs text-gray-600">Select text and Generate Insight using the bulb.</div>}
      <FlippableCards items={items} collapsedHeightClass="h-32" expandedHeightClass="h-[430px]" onFlip={handleFlip} />
    </div>
  );
};

export default Insights;