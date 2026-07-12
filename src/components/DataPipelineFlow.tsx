import React, { useCallback, useEffect, useState } from "react"
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
} from "reactflow"
import "reactflow/dist/style.css"

interface PipelineNode extends Node {
  data: {
    label: string
    status?: "active" | "idle" | "error"
  }
}

interface DataPipelineFlowProps {
  title?: string
  showMiniMap?: boolean
}

const DataPipelineFlow: React.FC<DataPipelineFlowProps> = ({
  title = "Data Pipeline Visualization",
  showMiniMap = true,
}) => {
  const initialNodes: PipelineNode[] = [
    {
      id: "postgresql",
      data: { label: "PostgreSQL", status: "active" },
      position: { x: 0, y: 150 },
      style: {
        background: "#ecfdf5",
        border: "2px solid #10b981",
        borderRadius: "8px",
        padding: "10px",
        minWidth: "120px",
      },
    },
    {
      id: "duckdb-query",
      data: { label: "DuckDB Engine", status: "active" },
      position: { x: 200, y: 150 },
      style: {
        background: "#fce7f3",
        border: "2px solid #ec4899",
        borderRadius: "8px",
        padding: "10px",
        minWidth: "120px",
      },
    },
    {
      id: "arrow-exchange",
      data: { label: "Apache Arrow (zero-copy)", status: "active" },
      position: { x: 400, y: 150 },
      style: {
        background: "#e0f2fe",
        border: "2px solid #0ea5e9",
        borderRadius: "8px",
        padding: "10px",
        minWidth: "160px",
      },
    },
    {
      id: "ai-analysis",
      data: { label: "AI Analysis (Gemini)", status: "active" },
      position: { x: 400, y: 320 },
      style: {
        background: "#dbeafe",
        border: "2px solid #3b82f6",
        borderRadius: "8px",
        padding: "10px",
        minWidth: "150px",
      },
    },
    {
      id: "visualization",
      data: { label: "Visualization (ECharts)", status: "active" },
      position: { x: 600, y: 150 },
      style: {
        background: "#fef2f2",
        border: "2px solid #ef4444",
        borderRadius: "8px",
        padding: "10px",
        minWidth: "150px",
      },
    },
    {
      id: "api-response",
      data: { label: "UI / API Response", status: "active" },
      position: { x: 800, y: 150 },
      style: {
        background: "#f5f3ff",
        border: "2px solid #8b5cf6",
        borderRadius: "8px",
        padding: "10px",
        minWidth: "140px",
      },
    },
  ]
  
  const initialEdges: Edge[] = [
    { id: "e1", source: "postgresql", target: "duckdb-query" },
    { id: "e2", source: "duckdb-query", target: "arrow-exchange" },
    { id: "e3", source: "arrow-exchange", target: "ai-analysis" },
    { id: "e4", source: "arrow-exchange", target: "visualization" },
    { id: "e5", source: "ai-analysis", target: "visualization" },
    { id: "e6", source: "visualization", target: "api-response" },
  ]
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  
  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  )
  
  return (
    <div className="data-pipeline-container" style={{ width: "100%", height: "600px" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Background color="#aaa" gap={16} />
        <Controls />
        {showMiniMap && <MiniMap />}
      </ReactFlow>
    </div>
  )
}

export default DataPipelineFlow
