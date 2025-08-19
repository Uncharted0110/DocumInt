import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import FlippableCards, { type FlippableCardItem } from './FlippableCards';
import { updateProjectInsights, type ProjectInsightPersist } from '../utils/projectStorage';
import { useMindmap } from '../contexts/MindmapContext';
import ReactMarkdown from 'react-markdown';

interface GeminiAnalysisResp { metadata?: any; retrieval_results?: any[]; gemini_analysis?: any[]; summary?: { top_insights?: string[] }; selected_text?: string; insight_id?: string; }
interface InsightsProps {
  projectName?: string;
  onNavigateToPage?: (page: number, text?: string) => void;
  onNavigateToSource?: (s: { fileName: string; page: number; searchText?: string }) => void;
  onOpenMindmap?: () => void;
}

const palette = ['bg-indigo-50 border-indigo-200','bg-emerald-50 border-emerald-200','bg-amber-50 border-amber-200','bg-sky-50 border-sky-200'];

const Insights: React.FC<InsightsProps> = ({ projectName, onNavigateToPage, onNavigateToSource, onOpenMindmap }) => {
  const [items, setItems] = useState<FlippableCardItem[]>([]);
  const [analysisById, setAnalysisById] = useState<Record<string, GeminiAnalysisResp>>({});
  const [podcastStatus, setPodcastStatus] = useState<Record<string, { state: 'idle'|'loading'|'ready'|'error'; audioUrl?: string; transcript?: string }>>({});
  const counterRef = useRef(0);
  const { updateMindmap } = useMindmap();

  // Load persisted insights from server
  useEffect(() => {
    (async () => {
      if (!projectName) return;
      try {
        const response = await fetch(`http://localhost:8000/projects/${projectName}/insights`);
        if (!response.ok) {
          console.warn('Failed to load insights from server');
          return;
        }
        
        const data = await response.json();
        const serverInsights = data.insights || [];
        
        if (serverInsights.length > 0) {
          const restored: FlippableCardItem[] = serverInsights.map((insight: any, i: number) => ({
            id: insight.insight_id,
            frontTitle: (insight.metadata?.job_to_be_done || 'Insight').slice(0,60) + ((insight.metadata?.job_to_be_done?.length || 0) > 60 ? '…' : ''),
            accentColor: palette[i % palette.length],
            frontExpandedContent: <div className="text-sm text-gray-600">Loading insight...</div>,
            backContent: insight.has_audio ? 
              audioEl(`http://localhost:8000/insight-audio/${projectName}/${insight.insight_id}.mp3`, insight.script) :
              <div className="text-xs text-gray-500">Flip to generate podcast.</div>,
            backExpandedContent: insight.has_audio ?
              audioEl(`http://localhost:8000/insight-audio/${projectName}/${insight.insight_id}.mp3`, insight.script) :
              <div className="text-sm text-gray-500">Flip to generate podcast.</div>
          }));
          
          counterRef.current = restored.length;
          setItems(restored);
          
          // Load full analysis data for each insight
          const analyses: Record<string, any> = {};
          const podcastStatuses: Record<string, any> = {};
          
          for (const insight of serverInsights) {
            try {
              const analysisResponse = await fetch(`http://localhost:8000/projects/${projectName}/insights/${insight.insight_id}`);
              if (analysisResponse.ok) {
                const fullAnalysis = await analysisResponse.json();
                analyses[insight.insight_id] = fullAnalysis;
                
                if (insight.has_audio) {
                  podcastStatuses[insight.insight_id] = {
                    state: 'ready',
                    audioUrl: fullAnalysis.audio_url,
                    transcript: fullAnalysis.script
                  };
                } else {
                  podcastStatuses[insight.insight_id] = { state: 'idle' };
                }
              }
            } catch (e) {
              console.warn(`Failed to load analysis for insight ${insight.insight_id}:`, e);
            }
          }
          
          setAnalysisById(analyses);
          setPodcastStatus(podcastStatuses);
          
          // Update front expanded content now that we have analysis data
          setItems(prev => prev.map(item => {
            const analysis = analyses[item.id];
            if (analysis) {
              return {
                ...item,
                frontExpandedContent: buildFrontExpanded(analysis.metadata?.job_to_be_done || 'Selected text', analysis)
              };
            }
            return item;
          }));
        }
      } catch (error) {
        console.warn('Error loading persisted insights:', error);
      }
    })();
  }, [projectName]); // Remove buildFrontExpanded dependency to avoid circular reference

  // Persist
  useEffect(() => {
    if (!projectName) return;
    const persist: ProjectInsightPersist[] = items.map(it => ({ id: it.id, task: it.frontTitle, accentColor: it.accentColor, analysis: analysisById[it.id], createdAt: new Date().toISOString() }));
    updateProjectInsights(projectName, persist);
  }, [items, analysisById, projectName]);

  const buildMindmap = useCallback((selected: string, analysis: GeminiAnalysisResp) => {
    // Use selected text as root node and relevant chunks as child nodes
    const rootNode = {
      id: "1",
      label: selected.length > 100 ? selected.slice(0, 100) + "..." : selected,
      x: 0,
      y: 0,
      color: "#ffcc00",
      type: "root"
    };

    const nodes: any[] = [rootNode];
    const links: { id: string; source: string; target: string }[] = [];

    // Add retrieval results (relevant chunks) as child nodes
    const retrievalResults = analysis.retrieval_results || [];
    retrievalResults.forEach((result, index) => {
      const nodeId = `chunk_${index + 2}`;
      // Use section title or create a summarized heading instead of full content
      const heading = result.section_title || 
                     result.heading || 
                     `Section ${index + 1}` ||
                     (result.content ? result.content.slice(0, 50) + "..." : `Chunk ${index + 1}`);
      
      const docStr = String(result.document ?? '');
      const base = docStr.split(/[/\\]/).pop() || docStr;
      
      nodes.push({
        id: nodeId,
        label: heading,
        x: 0,
        y: 0,
        color: "#4cafef",
        fileName: base,
        page: result.page_number,
        section: result.section_title,
        content: result.content, // Store full content for viewer
        document: result.document,
        type: "source"
      });

      links.push({
        id: `link_1_${nodeId}`,
        source: "1",
        target: nodeId
      });
    });

    // Update mindmap context with the new structure (only source nodes, no analysis)
    updateMindmap(selected, nodes, links);
  }, [updateMindmap]);

  const buildFrontExpanded = useCallback((selected: string, analysis: GeminiAnalysisResp) => {
    const top = analysis.summary?.top_insights || [];
    const retrieval = analysis.retrieval_results || [];
    const details = (analysis.gemini_analysis || []).filter(a=>!a.error);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm"><Sparkles size={14}/> Generated Insight</div>
        {top.length>0 && (
          <div>
            <div className="text-xs font-semibold text-gray-700 mb-1">Top Points</div>
            <div className="space-y-1">
              {top.map(t=> (
                <div key={t.slice(0,50)} className="prose prose-xs prose-slate max-w-none [&>*]:my-1 [&>h1]:text-xs [&>h2]:text-xs [&>h3]:text-xs [&>p]:text-xs [&>li]:text-xs">
                  <ReactMarkdown>{t}</ReactMarkdown>
                </div>
              ))}
            </div>
          </div>
        )}
        {retrieval.length>0 && (
          <div>
            <div className="text-xs font-semibold text-gray-700 mb-1">Sources</div>
            <ul className="text-[11px] space-y-1">
              {retrieval.slice(0,5).map(r => {
                const key = `${r.document}_${r.section_title}_${r.page_number}`;
                const docStr = String(r.document ?? '');
                const base = docStr.split(/[/\\]/).pop() || docStr;
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onNavigateToSource) {
                          onNavigateToSource({ fileName: base, page: Number(r.page_number) || 1, searchText: r.section_title });
                        } else {
                          // Back-compat fallback
                          onNavigateToPage?.((Number(r.page_number) || 1) - 1, r.section_title);
                        }
                      }}
                      className="underline text-blue-600 hover:text-blue-800"
                    >
                      {docStr}{r.section_title?` • ${r.section_title}`:''} (p.{r.page_number})
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {details.length>0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-gray-700">Details</div>
            {details.slice(0,3).map((d,i)=>{
              const key=`det_${i}`;
              return (
                <div key={key} className="border rounded p-2 bg-gray-50">
                  <div className="text-[11px] text-gray-500 mb-1">{d.document} • {d.section_title} (p.{d.page_number})</div>
                  <div className="prose prose-xs prose-slate max-w-none [&>*]:my-1 [&>h1]:text-xs [&>h2]:text-xs [&>h3]:text-xs [&>p]:text-xs [&>li]:text-xs [&>strong]:font-semibold">
                    <ReactMarkdown>{(d.gemini_analysis||'').slice(0,800)}</ReactMarkdown>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div>
          <button
            type="button"
            onClick={(e)=>{ e.stopPropagation(); buildMindmap(selected, analysis); onOpenMindmap?.(); }}
            className="px-2 py-1 text-[11px] rounded bg-purple-600 text-white hover:bg-purple-700"
          >
            View Mindmap
          </button>
        </div>
      </div>
    );
  }, [onNavigateToPage, onNavigateToSource, onOpenMindmap, buildMindmap]);

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
      
      // Automatically build and update mindmap with the new analysis
      buildMindmap(selectedText, analysis);
    };
    window.addEventListener('documint:newInsightAnalysis', handler as EventListener);
    return () => window.removeEventListener('documint:newInsightAnalysis', handler as EventListener);
  }, [buildMindmap]); // Include buildMindmap dependency

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
      const transcript = data.script || '';
      setItems(prev => prev.map(it => it.id===id ? { ...it, backContent: audioEl(audioUrl, transcript), backExpandedContent: audioEl(audioUrl, transcript) } : it));
      setPodcastStatus(p => ({ ...p, [id]: { state: 'ready', audioUrl, transcript } }));
    } catch (e) {
      console.debug('Podcast generation failed', e);
      setItems(prev => prev.map(it => it.id===id ? { ...it, backContent: <div className="text-xs text-red-600">Podcast failed.</div>, backExpandedContent: <div className="text-sm text-red-600">Podcast failed.</div> } : it));
      setPodcastStatus(p => ({ ...p, [id]: { state: 'error' } }));
    }
  };

  const handleFlip = (id: string, flipped: boolean) => {
    if (flipped) genPodcast(id);
  };

  const handleDelete = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    setAnalysisById(prev => {
      const { [id]: deleted, ...rest } = prev;
      return rest;
    });
    setPodcastStatus(prev => {
      const { [id]: deleted, ...rest } = prev;
      return rest;
    });
  };

  const audioEl = (src: string, transcript?: string) => (
    <div className="w-full">
      <audio controls className="w-full" src={src}><track kind="captions"/></audio>
      <div className="mt-1 text-[11px] text-gray-500">Podcast ready</div>
      {transcript && (
        <div className="mt-3 p-3 bg-gray-50 rounded border">
          <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
            📝 Podcast Script
          </div>
          <div className="text-xs text-gray-700 leading-relaxed max-h-40 overflow-y-auto bg-white p-2 rounded border prose prose-xs prose-slate max-w-none [&>*]:my-1 [&>h1]:text-xs [&>h2]:text-xs [&>h3]:text-xs [&>p]:text-xs [&>li]:text-xs [&>strong]:font-semibold">
            <ReactMarkdown>{transcript}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col">
      <div className="mb-2 flex items-center justify-between flex-shrink-0"><div className="font-semibold text-gray-700 flex items-center gap-2"><span className="w-4"></span> Insights</div><div className="text-xs text-gray-500">{items.length} total</div></div>
      <div className="text-xs text-gray-500 mb-3 italic">Select text with cursor to trigger the bulb</div>
      <div className="flex-1 overflow-y-auto">
        <FlippableCards items={items} collapsedHeightClass="h-32" expandedHeightClass="h-[430px]" onFlip={handleFlip} onDelete={handleDelete} />
      </div>
    </div>
  );
};

export default Insights;