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
  type?: 'root' | 'source';
  content?: string; // Full chunk content or analysis
  document?: string; // Full document path
}

interface MindmapLink {
  id: string;
  source: string;
  target: string;
}

interface MindmapContextType {
  nodes: MindmapNode[];
  links: MindmapLink[];
  updateMindmap: (selectedText: string, nodes: any[], links: any[]) => void;
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

  const updateMindmap = (_selectedText: string, newNodes: any[], newLinks: any[]) => {
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
