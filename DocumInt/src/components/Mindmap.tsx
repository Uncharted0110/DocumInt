import { useState, useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useLocation } from 'react-router-dom';
import { useMindmap } from '../contexts/MindmapContext';
import { AnimatedBackground } from './background';
import { ArrowLeft, Download, FileText } from 'lucide-react';

// Spacing & animation knobs
const MIN_V_SPACING = 120; // minimum vertical spacing between rows
const MIN_H_SPACING = 250; // minimum horizontal spacing between columns
const COLLAPSE_DURATION = 250; // ms
const DRAG_THRESHOLD_PX = 3; // minimum movement before considering as drag
const NODE_PADDING = 20; // padding inside nodes
const INTER_NODE_MARGIN = 40; // margin between nodes

interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
  fileName?: string;
  page?: number;
  section?: string;
  type?: 'root' | 'source';
  content?: string; // Full chunk content or analysis
  document?: string; // Full document path
}

interface Link {
  id: string;
  source: string;
  target: string;
}

interface MindMapProps {
  onClose: () => void;
  onNavigateToSource?: (s: { fileName: string; page: number; searchText?: string }) => void;
}

export default function MindMap({ onClose, onNavigateToSource }: Readonly<MindMapProps>) {
  const location = useLocation();
  // Get insightsData from route state
  const insightsData = location.state?.insightsData;
  const { nodes: ctxNodes, links: ctxLinks } = useMindmap();

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragDistRef = useRef(0);
  const zoomKRef = useRef(1);
  const prevPosRef = useRef<Record<string, { x: number; y: number }>>({});
  const miniMapSvgRef = useRef<SVGSVGElement>(null);
  const miniViewportRef = useRef<SVGRectElement>(null);
  const zoomTransformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Node viewer state
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const [nodes, setNodes] = useState<Node[]>([
    { id: "1", label: "Central Idea", x: 0, y: 0, color: "#ffcc00" },
  ]);

  const [links, setLinks] = useState<Link[]>([]);

  // Allow manual positioning (screen-space offsets) per node id
  const [positionOverrides, setPositionOverrides] = useState<Record<string, { dx: number; dy: number }>>({});
  // Track collapsed nodes (retract children)
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  // --- helpers to build a hierarchy from flat nodes + links ---
  function buildHierarchy() {
    // Determine root (node that is never a target). Fallback to "1".
    const targetSet = new Set(links.map((l) => l.target));
    const rootId = nodes.find((n) => !targetSet.has(n.id))?.id || "1";

    // Build children map
    const childrenMap = new Map<string, string[]>();
    links.forEach(({ source, target }) => {
      const arr = childrenMap.get(source) || [];
      arr.push(target);
      childrenMap.set(source, arr);
    });

    // Build tree data recursively (honor collapsedIds)
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const toTree = (id: string): any => ({
      id,
      label: nodeMap.get(id)?.label ?? id,
      color: nodeMap.get(id)?.color ?? "#ddd",
      children: collapsedIds.has(id) ? [] : (childrenMap.get(id) || []).map((childId) => toTree(childId)),
    });

    return toTree(rootId);
  }

  // Helper: update a node label by id
  const updateNodeLabel = useCallback((id: string, label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, label: trimmed } : n)));
  }, []);

  // Helper: delete a node (and its incident links)
  const deleteNodeById = useCallback((id: string) => {
    if (id === "1") return; // keep root safe
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setLinks((prev) => prev.filter((l) => l.source !== id && l.target !== id));
  }, []);

  // Sync from context (selected text + sources) when changed
  useEffect(() => {
    if (Array.isArray(ctxNodes) && ctxNodes.length > 0) {
      setNodes(ctxNodes as Node[]);
    }
    if (Array.isArray(ctxLinks)) {
      setLinks(ctxLinks as Link[]);
    }
  }, [ctxNodes, ctxLinks]);

  // --- render static layout with D3 tree + draggable overrides ---
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    const { clientWidth, clientHeight } = containerRef.current;
    const width = Math.max(800, clientWidth);
    const height = Math.max(600, clientHeight);

    // Clear previous content
    svg.selectAll("*").remove();

    // Root group for zoom/pan
    const g = svg.append("g").attr("class", "viewport");

    // Zoom behavior
    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .filter((event) => event.type === "wheel") // disable drag pan; allow wheel zoom only
      .scaleExtent([0.5, 2])
      .on("zoom", (event) => {
        zoomKRef.current = event.transform.k;
        zoomTransformRef.current = event.transform;
        g.attr("transform", event.transform);
        updateMiniViewport();
      });
    zoomBehaviorRef.current = zoomBehavior;
    svg.call(zoomBehavior as any);
    svg.on("dblclick.zoom", null);
    svg.style("cursor", "default");

    // Arrowhead
    const defs = svg.append("defs");
    defs
      .append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 14)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#666");

    // Build hierarchy and layout
    const treeData = buildHierarchy();
    const root = d3.hierarchy<any>(treeData);
    
    // Calculate dynamic node sizes first
    const nodeSizes: Record<string, { width: number; height: number }> = {};
    
    root.each((d: any) => {
      const text = d.data.label || "";
      // Better text measurement approach
      const lines = text.split(/\r?\n/).filter((line: string) => line.trim().length > 0);
      
      // Estimate character width more accurately (using average character width in pixels)
      const avgCharWidth = 8; // pixels per character for 14px sans-serif font
      const maxCharsPerLine = 45; // reasonable line length for readability
      
      // Calculate wrapped lines
      const wrappedLines: string[] = [];
      lines.forEach((line: string) => {
        if (line.length <= maxCharsPerLine) {
          wrappedLines.push(line);
        } else {
          // Break long lines at word boundaries
          const words = line.split(' ');
          let currentLine = '';
          words.forEach((word: string) => {
            if ((currentLine + word).length <= maxCharsPerLine) {
              currentLine += (currentLine ? ' ' : '') + word;
            } else {
              if (currentLine) wrappedLines.push(currentLine);
              currentLine = word;
            }
          });
          if (currentLine) wrappedLines.push(currentLine);
        }
      });
      
      // Calculate dimensions based on content
      const maxLineLength = Math.max(...wrappedLines.map((line: string) => line.length), 8);
      const lineCount = Math.max(wrappedLines.length, 1);
      
      // Calculate width and height with proper margins
      const contentWidth = maxLineLength * avgCharWidth;
      const minWidth = 120;
      const maxWidth = 400;
      const width = Math.min(Math.max(contentWidth + NODE_PADDING * 2, minWidth), maxWidth);
      
      const lineHeight = 20; // pixels per line
      const height = Math.max(lineCount * lineHeight + NODE_PADDING * 2, 60);
      
      nodeSizes[d.data.id] = { width, height };
    });
    
    // Calculate dynamic spacing based on node sizes
    const maxNodeWidth = Math.max(...Object.values(nodeSizes).map(s => s.width));
    const maxNodeHeight = Math.max(...Object.values(nodeSizes).map(s => s.height));
    
    const dynamicHSpacing = Math.max(MIN_H_SPACING, maxNodeWidth + INTER_NODE_MARGIN);
    const dynamicVSpacing = Math.max(MIN_V_SPACING, maxNodeHeight + INTER_NODE_MARGIN);
    
    const treeLayout = d3.tree<any>()
      .nodeSize([dynamicVSpacing, dynamicHSpacing])
      .separation((a, b) => {
        // Increase separation for nodes with larger content
        const aSize = nodeSizes[a.data.id] || { width: 160, height: 60 };
        const bSize = nodeSizes[b.data.id] || { width: 160, height: 60 };
        const avgWidth = (aSize.width + bSize.width) / 2;
        const baseSeparation = a.parent === b.parent ? 1 : 1.5;
        const sizeFactor = Math.max(1, avgWidth / 200); // Scale separation based on node size
        return baseSeparation * sizeFactor;
      });

    treeLayout(root);

    // Precompute descendants for drag (to move subtrees)
    const descendantsMap: Record<string, string[]> = {};
    root.each((n) => {
      const id = n.data.id as string;
      descendantsMap[id] = n.descendants().slice(1).map((d) => d.data.id as string);
    });

    // Center the tree (correct axis/dimension)
    const xMin = d3.min(root.descendants(), (d) => d.x ?? 0) ?? 0;
    const xMax = d3.max(root.descendants(), (d) => d.x ?? 0) ?? 0;
    const yMin = d3.min(root.descendants(), (d) => d.y ?? 0) ?? 0;
    const yMax = d3.max(root.descendants(), (d) => d.y ?? 0) ?? 0;
    const hOffset = width / 2 - (yMin + yMax) / 2; // horizontal center uses y-range
    const vOffset = height / 2 - (xMin + xMax) / 2; // vertical center uses x-range

    const getDx = (id?: string) => (id && positionOverrides[id]?.dx) || 0;
    const getDy = (id?: string) => (id && positionOverrides[id]?.dy) || 0;

    // Coordinate accessors with overrides
    const xAccessor = (d: any) => (d?.y ?? 0) + hOffset + getDx(d?.data?.id);
    const yAccessor = (d: any) => (d?.x ?? 0) + vOffset + getDy(d?.data?.id);

    // Precompute absolute target positions for animation and easy access
    const newPos: Record<string, { x: number; y: number }> = {};
    root.each((d) => {
      newPos[d.data.id] = { x: xAccessor(d), y: yAccessor(d) };
    });

    // LINKS (animated join)
    const linkGen = d3.linkHorizontal<any, any>().x((d: any) => newPos[d.data.id].x).y((d: any) => newPos[d.data.id].y);
    const linksSel = g.append("g").attr("class", "links").selectAll<SVGPathElement, any>("path").data(root.links(), (d: any) => d.target.data.id);

    linksSel
      .enter()
      .append("path")
      .attr("d", linkGen as any)
      .attr("fill", "none")
      .attr("stroke", "#666")
      .attr("stroke-width", 2)
      .attr("marker-end", "url(#arrowhead)")
      .style("opacity", 0)
      .transition()
      .duration(COLLAPSE_DURATION)
      .style("opacity", 1);

    linksSel
      .transition()
      .duration(COLLAPSE_DURATION)
      .attr("d", linkGen as any);

    linksSel
      .exit()
      .transition()
      .duration(COLLAPSE_DURATION)
      .style("opacity", 0)
      .remove();

    // NODES (animated join)
    const nodeSel = g.selectAll<SVGGElement, any>("g.node")
      .data(root.descendants(), (d: any) => d.data.id);

    // Remove old nodes
    nodeSel.exit().remove();

    // Enter new nodes with adaptive sizing and formatted text
    const nodeEnter = nodeSel.enter().append("g")
      .attr("class", "node")
      .attr("transform", (d: any) => {
        const prev = prevPosRef.current[d.data.id];
        if (prev) return `translate(${prev.x},${prev.y})`;
        const parentPos = d.parent ? newPos[d.parent.data.id] : newPos[d.data.id];
        return `translate(${parentPos.x},${parentPos.y})`;
      })
      .style("cursor", "move")
      .each(function (d: any) {
        const group = d3.select(this);
        const text = d.data.label || "";
        
        // Use pre-calculated sizes
        const nodeSize = nodeSizes[d.data.id] || { width: 160, height: 60 };
        const rectWidth = nodeSize.width;
        const rectHeight = nodeSize.height;
        
        // Main node rectangle
        group.append("rect")
          .attr("x", -rectWidth / 2)
          .attr("y", -rectHeight / 2)
          .attr("width", rectWidth)
          .attr("height", rectHeight)
          .attr("rx", 10)
          .attr("ry", 10)
          .attr("fill", d.data.color || "#ddd")
          .attr("stroke", "#333")
          .attr("stroke-width", 2)
          .style("filter", "drop-shadow(1px 1px 2px rgba(0,0,0,0.25))");
        
        // Node text content with proper word wrapping
        group.append("foreignObject")
          .attr("x", -rectWidth / 2 + NODE_PADDING / 2)
          .attr("y", -rectHeight / 2 + NODE_PADDING / 2)
          .attr("width", rectWidth - NODE_PADDING)
          .attr("height", rectHeight - NODE_PADDING)
          .append("xhtml:div")
          .style("font", "14px sans-serif")
          .style("font-weight", "bold")
          .style("color", "#222")
          .style("white-space", "pre-wrap")
          .style("word-wrap", "break-word")
          .style("overflow-wrap", "break-word")
          .style("line-height", "1.4")
          .style("text-align", "center")
          .style("display", "flex")
          .style("align-items", "center")
          .style("justify-content", "center")
          .style("height", "100%")
          .style("box-sizing", "border-box")
          .text(text);

        // Add viewer PDF icon for source nodes
        const nodeData = ctxNodes.find((n: any) => n.id === d.data.id);
        if (nodeData && nodeData.type === 'source' && nodeData.content) {
          const iconGroup = group.append("g")
            .attr("class", "viewer-icon")
            .style("cursor", "pointer");

          // PDF/Document icon using foreignObject - positioned relative to actual node size
          const iconForeign = iconGroup.append("foreignObject")
            .attr("x", rectWidth / 2 - 30)
            .attr("y", -rectHeight / 2 + 8)
            .attr("width", 24)
            .attr("height", 24);

          iconForeign.append("xhtml:div")
            .style("width", "24px")
            .style("height", "24px")
            .style("display", "flex")
            .style("align-items", "center")
            .style("justify-content", "center")
            .style("color", "rgba(255, 255, 255, 0.8)")
            .style("transition", "color 0.2s ease")
            .style("cursor", "pointer")
            .html(`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14,2 14,8 20,8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10,9 9,9 8,9"></polyline></svg>`);

          // Click handler for the icon group
          iconGroup.on("click", function(event: MouseEvent) {
            event.stopPropagation(); // Prevent node drag/click
            if (nodeData) {
              setSelectedNode(nodeData);
              setIsViewerOpen(true);
            }
          });

          // Hover effects
          iconGroup
            .on("mouseenter", function() {
              d3.select(this).select("foreignObject div")
                .style("color", "rgba(255, 255, 255, 1)")
                .style("transform", "scale(1.1)");
            })
            .on("mouseleave", function() {
              d3.select(this).select("foreignObject div")
                .style("color", "rgba(255, 255, 255, 0.8)")
                .style("transform", "scale(1)");
            });
        }
      });

    // Update positions for all nodes
    const allNodes = nodeSel.merge(nodeEnter as any);
    allNodes.transition()
      .duration(COLLAPSE_DURATION)
      .attr("transform", (d: any) => `translate(${newPos[d.data.id].x},${newPos[d.data.id].y})`);

    // Node interactions (dblclick, etc)
    allNodes
      .on("dblclick", (_event: any, d: any) => {
        const updated = prompt("Edit node label:", d.data.label);
        if (!updated) return;
        updateNodeLabel(d.data.id, updated);
      })
      .on("contextmenu", (event: PointerEvent, d: any) => {
        event.preventDefault();
        if (d.data.id === "1") return;
        if (!confirm(`Delete "${d.data.label}"?`)) return;
        deleteNodeById(d.data.id);
      });
    allNodes.on("click", (event: MouseEvent, d: any) => {
      if ((event as any).detail && (event as any).detail > 1) return; // ignore dblclick
      if (isDraggingRef.current) return;
      
      // If this is a source node with navigation metadata, trigger navigation
      if (d?.data?.fileName && d?.data?.page) {
        onNavigateToSource?.({ fileName: d.data.fileName, page: d.data.page, searchText: d.data.section });
        return;
      }
      
      // Default behavior: toggle collapse for nodes with children
      setCollapsedIds((prev) => {
        const next = new Set(prev);
        if (next.has(d.data.id)) next.delete(d.data.id);
        else next.add(d.data.id);
        return next;
      });
    });
    // Drag behavior (zoom-aware, thresholded) for non-root nodes
    const dragBehavior = d3
      .drag<SVGGElement, any>()
      .on("start", (_event, _d) => {
        isDraggingRef.current = false;
        dragDistRef.current = 0;
      })
      .on("drag", (event, d) => {
        const k = zoomKRef.current || 1;
        const dx = (event.dx || 0) / k;
        const dy = (event.dy || 0) / k;
        dragDistRef.current += Math.hypot(dx, dy);
        if (dragDistRef.current < DRAG_THRESHOLD_PX) return;
        isDraggingRef.current = true;
        const moveIds = [d.data.id, ...(descendantsMap[d.data.id] || [])];
        setPositionOverrides((prev) => {
          const next: Record<string, { dx: number; dy: number }> = { ...prev };
          for (const id of moveIds) {
            const cur = next[id] || { dx: 0, dy: 0 };
            next[id] = { dx: cur.dx + dx, dy: cur.dy + dy };
          }
          return next;
        });
      })
      .on("end", () => {
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 0);
      });

    allNodes.call(dragBehavior as any);

    // Remember positions for next transition
    prevPosRef.current = newPos;

    // After computing newPos, render/update minimap
    const miniSvg = d3.select(miniMapSvgRef.current);
    const miniWidth = 180;
    const miniHeight = 120;
    miniSvg.selectAll("*").remove();

    const allXs = Object.values(newPos).map((p) => p.x);
    const allYs = Object.values(newPos).map((p) => p.y);
    const minX = d3.min(allXs) ?? 0;
    const maxX = d3.max(allXs) ?? width;
    const minY = d3.min(allYs) ?? 0;
    const maxY = d3.max(allYs) ?? height;

    const pad = 20;
    const worldW = Math.max(1, maxX - minX);
    const worldH = Math.max(1, maxY - minY);
    const sx = (miniWidth - pad * 2) / worldW;
    const sy = (miniHeight - pad * 2) / worldH;
    const s = Math.min(sx, sy);

    const worldToMini = (p: { x: number; y: number }) => ({
      x: pad + (p.x - minX) * s,
      y: pad + (p.y - minY) * s,
    });

    const miniG = miniSvg.append("g");

    // Mini links
    const miniLink = d3
      .linkHorizontal<any, any>()
      .x((d: any) => worldToMini(newPos[d.data.id]).x)
      .y((d: any) => worldToMini(newPos[d.data.id]).y);

    miniG
      .append("g")
      .selectAll("path")
      .data(root.links() as any)
      .enter()
      .append("path")
      .attr("d", miniLink as any)
      .attr("fill", "none")
      .attr("stroke", "#cfd8dc")
      .attr("stroke-width", 1);

    // Mini nodes
    miniG
      .append("g")
      .selectAll("circle")
      .data(root.descendants())
      .enter()
      .append("circle")
      .attr("r", 2.5)
      .attr("fill", "#90caf9")
      .attr("stroke", "#0d47a1")
      .attr("stroke-width", 0.5)
      .attr("cx", (d: any) => worldToMini(newPos[d.data.id]).x)
      .attr("cy", (d: any) => worldToMini(newPos[d.data.id]).y);

    // Mini viewport rect (shows current view)
    const viewRect = miniG
      .append("rect")
      .attr("fill", "rgba(255,255,255,0.2)")
      .attr("stroke", "#607d8b")
      .attr("stroke-width", 1);
    miniViewportRef.current = viewRect.node() as SVGRectElement;

    const updateMiniViewport = () => {
      const t = zoomTransformRef.current;
      const tl = t.invert([0, 0]);
      const br = t.invert([width, height]);
      const tlM = worldToMini({ x: tl[0], y: tl[1] });
      const brM = worldToMini({ x: br[0], y: br[1] });
      const x = Math.min(tlM.x, brM.x);
      const y = Math.min(tlM.y, brM.y);
      const w = Math.abs(brM.x - tlM.x);
      const h = Math.abs(brM.y - tlM.y);
      viewRect.attr("x", x).attr("y", y).attr("width", w).attr("height", h);
    };

    updateMiniViewport();
  }, [nodes, links, updateNodeLabel, deleteNodeById, positionOverrides, collapsedIds, insightsData]);

  // If insightsData is present, use it to set nodes/links
  useEffect(() => {
    if (insightsData?.persona && Array.isArray(insightsData.chunks) && insightsData.chunks.length > 0) {
      const newNodes: Node[] = [
        { id: "1", label: insightsData.persona, x: 0, y: 0, color: "#ffcc00" }
      ];
      const newLinks: Link[] = [];
      insightsData.chunks.forEach((chunk: string, index: number) => {
        const id = (index + 2).toString();
        newNodes.push({ id, label: chunk, x: 0, y: 0, color: "#4cafef" });
        newLinks.push({ id: `e1-${id}`, source: "1", target: id });
      });
      setNodes(newNodes);
      setLinks(newLinks);
    }
  }, [insightsData]);

  const centerOnRoot = useCallback(() => {
    if (!svgRef.current || !containerRef.current || !zoomBehaviorRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const width = Math.max(800, clientWidth);
    const height = Math.max(600, clientHeight);
    const rootPos = prevPosRef.current["1"] || { x: width / 2, y: height / 2 };
    const t = d3.zoomIdentity.translate(width / 2 - rootPos.x, height / 2 - rootPos.y).scale(1);
    d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.transform as any, t);
  }, []);

  const exportToPNG = async () => {
    if (!containerRef.current) return;
    const canvas = await html2canvas(containerRef.current);
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "mindmap.png";
    link.click();
  };

  const exportToPDF = async () => {
    if (!containerRef.current) return;
    const canvas = await html2canvas(containerRef.current);
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width, canvas.height] });
    pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save("mindmap.pdf");
  };

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex" }}>
      {/* Left Panel - Mindmap */}
      <div style={{
        flex: 1,
        position: "relative",
        background: "#9b92d4",
        overflow: "hidden",
      }}>
        {/* Close button - transparent left arrow at top left */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 20,
            left: 20,
            zIndex: 10,
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "50%",
            width: 48,
            height: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.3s ease",
            backdropFilter: "blur(10px)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.2)";
            e.currentTarget.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.1)";
            e.currentTarget.style.transform = "scale(1)";
          }}
          title="Close Mind Map"
        >
          <ArrowLeft size={20} color="rgba(255,255,255,0.8)" />
        </button>

        {/* Export buttons - top right of mindmap panel */}
        <div
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            zIndex: 10,
            display: "flex",
            gap: 12,
          }}
        >
          <button
            onClick={exportToPNG}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "50%",
              width: 48,
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.3s ease",
              backdropFilter: "blur(10px)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(238, 255, 244, 0.8)";
              e.currentTarget.style.transform = "scale(1.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              e.currentTarget.style.transform = "scale(1)";
            }}
            title="Export as PNG"
          >
            <Download size={20} color="rgba(255,255,255,0.8)" />
          </button>
          
          <button
            onClick={exportToPDF}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "50%",
              width: 48,
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.3s ease",
              backdropFilter: "blur(10px)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(244, 237, 225, 0.8)";
              e.currentTarget.style.transform = "scale(1.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              e.currentTarget.style.transform = "scale(1)";
            }}
            title="Export as PDF"
          >
            <FileText size={20} color="rgba(255,255,255,0.8)" />
          </button>
        </div>

        {/* SVG Canvas with animated background */}
        <div
          ref={containerRef}
          style={{
            width: "100%",
            height: "100%",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Subtle animated starry background */}
          <div 
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.85,
              mixBlendMode: "multiply",
              zIndex: 0,
            }}
          >
            <AnimatedBackground />
          </div>
          
          <svg ref={svgRef} width="100%" height="100%" style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, position: "relative", zIndex: 1 }} />

          {/* Zoom controls (minimize/maximize + center) */}
          <div
            style={{
              position: "absolute",
              left: 12,
              bottom: 18,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              background: "rgba(255,255,255,0.1)",
              borderRadius: 10,
              boxShadow: "0 6px 16px rgba(0,0,0,0.2)",
              padding: 6,
              zIndex: 2,
              backdropFilter: "blur(10px)",
            }}
          >
            <button onClick={centerOnRoot} title="Center on Root" style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.1)", cursor: "pointer", color: "rgba(255,255,255,0.8)" }}>⌂</button>
          </div>

          {/* MiniMap bottom-right */}
          <div
            style={{
              position: "absolute",
              right: 18,
              bottom: 18,
              width: 200,
              height: 140,
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(2px)",
              borderRadius: 10,
              boxShadow: "0 6px 16px rgba(0,0,0,0.2)",
              padding: 8,
              pointerEvents: "none",
              zIndex: 2,
            }}
          >
            <svg ref={miniMapSvgRef} width="100%" height="100%" />
          </div>
        </div>
      </div>

      {/* Right Panel - Node Content Viewer */}
      {isViewerOpen && selectedNode && (
        <div style={{
          width: "400px",
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          borderLeft: "1px solid rgba(255, 255, 255, 0.2)",
          display: "flex",
          flexDirection: "column",
          zIndex: 10,
        }}>
          {/* Header */}
          <div style={{
            padding: "20px",
            borderBottom: "1px solid rgba(0, 0, 0, 0.1)",
            background: "linear-gradient(135deg, rgba(199, 210, 254, 0.3), rgba(221, 214, 254, 0.3))",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <h2 style={{
                  fontSize: "18px",
                  fontWeight: "bold",
                  color: "#1f2937",
                  margin: "0 0 8px 0",
                  lineHeight: "1.4",
                }}>{selectedNode.label}</h2>
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  fontSize: "12px",
                  color: "#6b7280",
                }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    📄 <strong>{selectedNode.fileName || 'Unknown Document'}</strong>
                  </span>
                  {selectedNode.page && (
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      📖 Page <strong>{selectedNode.page}</strong>
                    </span>
                  )}
                  {selectedNode.section && (
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      📑 Section: <strong>{selectedNode.section}</strong>
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  setIsViewerOpen(false);
                  setSelectedNode(null);
                }}
                style={{
                  padding: "8px",
                  background: "rgba(255, 255, 255, 0.8)",
                  border: "1px solid rgba(0, 0, 0, 0.1)",
                  borderRadius: "50%",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(243, 244, 246, 1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.8)";
                }}
                title="Close"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
          }}>
            <div style={{
              whiteSpace: "pre-wrap",
              lineHeight: "1.6",
              color: "#374151",
              background: "rgba(249, 250, 251, 0.8)",
              padding: "16px",
              borderRadius: "8px",
              border: "1px solid rgba(0, 0, 0, 0.05)",
              fontSize: "14px",
            }}>
              {selectedNode.content || 'No detailed content available.'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}