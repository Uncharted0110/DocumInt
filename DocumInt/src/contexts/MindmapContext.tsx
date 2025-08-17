import React, { createContext, useContext, useState, useMemo } from 'react';
import type { ReactNode } from 'react';

interface MindmapNode {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
  // Optional navigation metadata (for source nodes)
  fileName?: string;
  page?: number;
  section?: string;
  type?: 'root' | 'source' | 'insight';
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

  const updateMindmap = (selectedText: string, _insights: any[], sources: any[]) => {
    // Build nodes: root = full selected text; children = source entries with page metadata
    const newNodes: MindmapNode[] = [
      { id: '1', label: selectedText, x: 0, y: 0, color: '#ffcc00', type: 'root' },
    ];
    const newLinks: MindmapLink[] = [];

    sources.slice(0, 8).forEach((source: any, index: number) => {
      const sourceId = `source_${index}`;
      const docStr = String(source.document ?? '');
      const base = docStr.split(/[/\\]/).pop() || docStr;
      const page = Number(source.page_number) || 1;
  const section = source.section_title ? ' • ' + String(source.section_title) : '';
  const label = base + ' (p.' + page + ')' + section;
      newNodes.push({
        id: sourceId,
        label,
        x: 0,
        y: 0,
        color: '#81c784',
        fileName: base,
        page,
        section: source.section_title,
        type: 'source',
      });
      newLinks.push({ id: `link_${sourceId}`, source: '1', target: sourceId });
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
