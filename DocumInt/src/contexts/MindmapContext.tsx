import React, { createContext, useContext, useState, useMemo } from 'react';
import type { ReactNode } from 'react';

interface MindmapNode {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
}

interface MindmapLink {
  id: string;
  source: string;
  target: string;
}

interface MindmapContextType {
  nodes: MindmapNode[];
  links: MindmapLink[];
  updateMindmap: (selectedText: string, insights: any[], sources: any[]) => void;
}

const MindmapContext = createContext<MindmapContextType | undefined>(undefined);

export const useMindmap = () => {
  const context = useContext(MindmapContext);
  if (!context) {
    throw new Error('useMindmap must be used within MindmapProvider');
  }
  return context;
};

interface MindmapProviderProps {
  children: ReactNode;
}

export const MindmapProvider: React.FC<MindmapProviderProps> = ({ children }) => {
  const [nodes, setNodes] = useState<MindmapNode[]>([
    { id: "1", label: "Central Idea", x: 0, y: 0, color: "#ffcc00" },
  ]);
  const [links, setLinks] = useState<MindmapLink[]>([]);

  const updateMindmap = (selectedText: string, insights: any[], sources: any[]) => {
    // Create new mindmap structure based on selected text and insights
    const newNodes: MindmapNode[] = [
      { id: "1", label: selectedText.substring(0, 50) + "...", x: 0, y: 0, color: "#ffcc00" },
    ];
    const newLinks: MindmapLink[] = [];

    // Add insight nodes
    insights.forEach((insight, index) => {
      const insightId = `insight_${index}`;
      newNodes.push({
        id: insightId,
        label: insight.gemini_analysis?.substring(0, 80) + "..." || `Insight ${index + 1}`,
        x: 0,
        y: 0,
        color: "#4cafef"
      });
      newLinks.push({
        id: `link_${insightId}`,
        source: "1",
        target: insightId
      });
    });

    // Add source nodes
    sources.slice(0, 5).forEach((source, index) => {
      const sourceId = `source_${index}`;
      newNodes.push({
        id: sourceId,
        label: `${source.document} - ${source.section_title}`,
        x: 0,
        y: 0,
        color: "#81c784"
      });
      newLinks.push({
        id: `link_${sourceId}`,
        source: "1",
        target: sourceId
      });
    });

    setNodes(newNodes);
    setLinks(newLinks);
  };

  const value = useMemo(() => ({
    nodes,
    links,
    updateMindmap
  }), [nodes, links]);

  return (
    <MindmapContext.Provider value={value}>
      {children}
    </MindmapContext.Provider>
  );
};
