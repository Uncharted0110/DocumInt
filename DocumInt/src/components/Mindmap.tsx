import { useState, useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useLocation } from 'react-router-dom';

// Spacing & animation knobs
const V_SPACING = 90; // vertical spacing between rows
const H_SPACING = 200; // horizontal spacing between columns
const COLLAPSE_DURATION = 250; // ms
const DRAG_THRESHOLD_PX = 3; // minimum movement before considering as drag

interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
}

interface Link {
  id: string;
  source: string;
  target: string;
}

interface MindMapProps {
  onClose: () => void;
}

export default function MindMap({ onClose }: Readonly<MindMapProps>) {
  const location = useLocation();
  // Get insightsData from route state
  const insightsData = location.state?.insightsData;

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

  const [nodes, setNodes] = useState<Node[]>([
    { id: "1", label: "Central Idea", x: 0, y: 0, color: "#ffcc00" },
    { id: "2", label: "Branch A", x: 0, y: 0, color: "#4cafef" },
    { id: "3", label: "Branch B", x: 0, y: 0, color: "#81c784" },
  ]);

  const [links, setLinks] = useState<Link[]>([
    { id: "e1-2", source: "1", target: "2" },
    { id: "e1-3", source: "1", target: "3" },
  ]);

  const [newLabel, setNewLabel] = useState("");
  const [parentId, setParentId] = useState("1");
  const [isControlsMinimized, setIsControlsMinimized] = useState(false);

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
    const treeLayout = d3.tree<any>()
      .nodeSize([V_SPACING, H_SPACING])
      .separation((a, b) => (a.parent === b.parent ? 1 : 1.25));

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
        // Estimate width: 10px per character, min 160, max 400
        const lines = text.split(/\r?\n|(?<=\.) /g);
        const maxLineLength = Math.max(...lines.map((l: string) => l.length));
        const rectWidth = Math.min(Math.max(16 * maxLineLength, 160), 400);
        const rectHeight = Math.max(48, 24 * lines.length);
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
        group.append("foreignObject")
          .attr("x", -rectWidth / 2 + 8)
          .attr("y", -rectHeight / 2 + 8)
          .attr("width", rectWidth - 16)
          .attr("height", rectHeight - 16)
          .append("xhtml:div")
          .style("font", "14px sans-serif")
          .style("font-weight", "bold")
          .style("color", "#222")
          .style("white-space", "pre-line")
          .style("word-break", "break-word")
          .style("line-height", "1.4")
          .style("text-align", "center")
          .text(text);
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
    if (insightsData && insightsData.persona && Array.isArray(insightsData.chunks) && insightsData.chunks.length > 0) {
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

  // Zoom controls
  const zoomIn = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(200).call(zoomBehaviorRef.current.scaleBy as any, 1.2);
  }, []);

  const zoomOut = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(200).call(zoomBehaviorRef.current.scaleBy as any, 1 / 1.2);
  }, []);

  const centerOnRoot = useCallback(() => {
    if (!svgRef.current || !containerRef.current || !zoomBehaviorRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const width = Math.max(800, clientWidth);
    const height = Math.max(600, clientHeight);
    const rootPos = prevPosRef.current["1"] || { x: width / 2, y: height / 2 };
    const t = d3.zoomIdentity.translate(width / 2 - rootPos.x, height / 2 - rootPos.y).scale(1);
    d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.transform as any, t);
  }, []);

  // Add node under selected parent
  const addNode = useCallback(() => {
    const label = newLabel.trim();
    if (!label) return;

    const colors = ["#ff9999", "#99ccff", "#99ff99", "#ffcc99", "#d1b3ff", "#ffb3ba", "#bae1ff", "#bfddac"];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const newId = (nodes.length + 1).toString();

    setNodes((prev) => [...prev, { id: newId, label, x: 0, y: 0, color }]);
    setLinks((prev) => [...prev, { id: `e${parentId}-${newId}`, source: parentId, target: newId }]);
    setNewLabel("");
  }, [newLabel, parentId, nodes.length]);

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
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      {/* Controls (restyled) */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 10,
          background: "#ffffff",
          padding: "16px",
          borderRadius: "12px",
          boxShadow: "0 10px 20px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          minWidth: isControlsMinimized ? "auto" : "280px",
          maxWidth: isControlsMinimized ? "60px" : "300px",
          transition: "all 0.3s ease",
        }}
      >
        {/* Toggle */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {!isControlsMinimized && (
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#1f2937" }}>Mind Map Controls</span>
          )}
          <button
            onClick={() => setIsControlsMinimized(!isControlsMinimized)}
            style={{
              background: "#f3f4f6",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              cursor: "pointer",
              padding: "4px 8px",
              fontSize: "12px",
              color: "#374151",
            }}
          >
            {isControlsMinimized ? "⚙️" : "−"}
          </button>
        </div>

        {!isControlsMinimized && (
          <>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: -4 }}>Add New Node</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input
                type="text"
                placeholder="Enter node content..."
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addNode()}
                style={{ padding: 10, border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14, flex: 1, outline: "none" }}
              />
            </div>

            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                style={{ padding: 10, border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12, flex: 1 }}
              >
                {nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label.length > 20 ? n.label.substring(0, 20) + "..." : n.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={addNode}
              disabled={!newLabel.trim()}
              style={{
                padding: "10px 12px",
                background: newLabel.trim() ? "#6b7280" : "#e5e7eb",
                color: newLabel.trim() ? "#ffffff" : "#9ca3af",
                border: "none",
                borderRadius: 8,
                cursor: newLabel.trim() ? "pointer" : "not-allowed",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              + Add Node
            </button>

            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>Export Options</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={exportToPNG} style={{ padding: "8px 12px", background: "#22c55e", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12 }}>
                🖼️ PNG
              </button>
              <button onClick={exportToPDF} style={{ padding: "8px 12px", background: "#f59e0b", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12 }}>
                📄 PDF
              </button>
              <button onClick={onClose} style={{ padding: "10px 12px", background: "#ef4444", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700, width: "100%" }}>
                ✕ Close Mind Map
              </button>
            </div>

            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
              💡 Tips: Double-click to edit • Right-click to delete • Use mouse wheel or +/− to zoom
            </div>
          </>
        )}
      </div>

      {/* Info Panel */}
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 10,
          background: "#fff",
          padding: "10px",
          borderRadius: "8px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          fontSize: "12px",
          color: "#666",
        }}
      >
        <div>Nodes: {nodes.length}</div>
        <div>Links: {links.length}</div>
      </div>

      {/* SVG Canvas with dark gradient + dotted grid */}
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          background:"#9b92d4",
          overflow: "hidden",
        }}
      >
        <svg ref={svgRef} width="100%" height="100%" style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6 }} />

        {/* Zoom controls (minimize/maximize + center) */}
        <div
          style={{
            position: "absolute",
            left: 12,
            bottom: 18,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            background: "rgba(255,255,255,0.85)",
            borderRadius: 10,
            boxShadow: "0 6px 16px rgba(0,0,0,0.2)",
            padding: 6,
          }}
        >
          <button onClick={zoomIn} title="Zoom In" style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontWeight: 700 }}>+</button>
          <button onClick={zoomOut} title="Zoom Out" style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontWeight: 700 }}>−</button>
          <button onClick={centerOnRoot} title="Center on Root" style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" }}>⌂</button>
        </div>

        {/* MiniMap bottom-right */}
        <div
          style={{
            position: "absolute",
            right: 18,
            bottom: 18,
            width: 200,
            height: 140,
            background: "rgba(255,255,255,0.75)",
            backdropFilter: "blur(2px)",
            borderRadius: 10,
            boxShadow: "0 6px 16px rgba(0,0,0,0.2)",
            padding: 8,
            pointerEvents: "none",
          }}
        >
          <svg ref={miniMapSvgRef} width="100%" height="100%" />
        </div>
      </div>
    </div>
  );
}