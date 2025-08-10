import { useState, useCallback, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type Edge,
} from "reactflow";
import "reactflow/dist/style.css";

import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface MindMapProps {
  onClose: () => void;
}

export default function MindMap({ onClose }: MindMapProps) {
  const reactFlowWrapper = useRef(null);

  const [nodes, setNodes] = useState([
    {
      id: "1",
      position: { x: 250, y: 100 },
      data: { label: "Central Idea" },
      style: { background: "#ffcc00", color: "#000", border: "2px solid #333" },
    },
    {
      id: "2",
      position: { x: 100, y: 300 },
      data: { label: "Branch A" },
      style: { background: "#4cafef", color: "#fff", border: "2px solid #036" },
    },
    {
      id: "3",
      position: { x: 400, y: 300 },
      data: { label: "Branch B" },
      style: { background: "#81c784", color: "#000", border: "2px solid #064" },
    },
  ]);

  const [edges, setEdges] = useState([
    { id: "e1-2", source: "1", target: "2" },
    { id: "e1-3", source: "1", target: "3" },
  ]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const [newLabel, setNewLabel] = useState("");
  const [parentId, setParentId] = useState("1");

  const addNode = () => {
    if (!newLabel.trim()) return;
    const newId = (nodes.length + 1).toString();

    // Random color for each new node
    const colors = ["#ff9999", "#99ccff", "#99ff99", "#ffcc99", "#d1b3ff"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newNode = {
      id: newId,
      position: { x: Math.random() * 500, y: Math.random() * 500 },
      data: { label: newLabel },
      style: {
        background: randomColor,
        color: "#000",
        border: "2px solid #333",
      },
    };

    setNodes((nds) => [...nds, newNode]);
    setEdges((eds) => [
      ...eds,
      { id: `e${parentId}-${newId}`, source: parentId, target: newId },
    ]);
    setNewLabel("");
  };

  const exportToPNG = async () => {
    if (!reactFlowWrapper.current) return;
    const canvas = await html2canvas(reactFlowWrapper.current);
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "mindmap.png";
    link.click();
  };

  const exportToPDF = async () => {
    if (!reactFlowWrapper.current) return;
    const canvas = await html2canvas(reactFlowWrapper.current);
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "px",
      format: [canvas.width, canvas.height],
    });
    pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save("mindmap.pdf");
  };

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      {/* Controls */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 10,
          background: "#fff",
          padding: "10px",
          borderRadius: "8px",
          boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
          display: 'flex',
          alignItems: 'center',
          gap: '5px'
        }}
      >
        <input
          type="text"
          placeholder="Node content..."
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
        />
        <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
          {nodes.map((n) => (
            <option key={n.id} value={n.id}>
              {n.data.label}
            </option>
          ))}
        </select>
        <button onClick={addNode}>Add Node</button>
        <button onClick={exportToPNG}>
          Export PNG
        </button>
        <button onClick={exportToPDF}>
          Export PDF
        </button>
        <button 
          onClick={onClose} 
          style={{ 
            background: '#f44336', 
            color: 'white', 
            border: 'none', 
            padding: '5px 10px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Close
        </button>
      </div>

      {/* React Flow Canvas */}
      <div style={{ width: "100%", height: "100%" }} ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </div>
    </div>
  );
}