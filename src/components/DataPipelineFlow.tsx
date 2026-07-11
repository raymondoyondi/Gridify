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
      id: "iot-sensors",
      data: { label: "IoT Sensors", status: "active" },
      position: { x: 0, y: 50 },
      style: {
        background: "#ecfdf5",
        border: "2px solid #10b981",
        borderRadius: "8px",
        padding: "10px",
        minWidth: "120px",
      },
    },
    {
      id: "data-ingestion",
      data: { label: "Data Ingestion", status: "active" },
      position: { x: 200, y: 50 },
      style: {
        background: "#e0f2fe",
        border: "2px solid #0ea5e9",
        borderRadius: "8px",
        padding: "10px",
        minWidth: "120px",
      },
    },
    {
      id: "normalization",
      data: { label: "Normalization", status: "active" },
      position: { x: 400, y: 50 },
      style: {
        background: "#f3e8ff",
        border: "2px solid #a855f7",
        borderRadius: "8px",
        padding: "10px",
        minWidth: "120px",
      },
    },
    {
      id: "polars-processing",
      data: { label: "Polars Processing", status: "active" },
      position: { x: 100, y: 200 },
      style: {
        background: "#fef3c7",
        border: "2px solid #f59e0b",
        borderRadius: "8px",
        padding: "10px",
        minWidth: "140px",
      },
    },
    {
      id: "duckdb-query",
      data: { label: "DuckDB Query", status: "active" },
      position: { x: 300, y: 200 },
      style: {
        background: "#fce7f3",
        border: "2px solid #ec4899",
        borderRadius: "8px",
        padding: "10px",
        minWidth: "120px",
      },
    },
    {
      id: "ai-analysis",
      data: { label: "AI Analysis (LangChain)", status: "active" },
      position: { x: 500, y: 200 },
      style: {
        background: "#dbeafe",
        border: "2px solid #3b82f6",
        borderRadius: "8px",
        padding: "10px",
        minWidth: "150px",
      },
    },
    {
      id: "vector-embeddings",
      data: { label: "Vector Embeddings", status: "active" },
      position: { x: 200, y: 350 },
      style: {
        background: "#f0fdf4",
        border: "2px solid #22c55e",
        borderRadius: "8px",
        padding: "10px",
        minWidth: "140px",
      },
    },
    {
      id: "visualization",
      data: { label: "Visualization (ECharts)", status: "active" },
      position: { x: 400, y: 350 },
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
      data: { label: "API Response", status: "active" },
      position: { x: 200, y: 500 },
      style: {
        background: "#f5f3ff",
        border: "2px solid #8b5cf6",
        borderRadius: "8px",
        padding: "10px",
        minWidth: "120px",
      },
    },
  ]

  const initialEdges: Edge[] = [
    { id: "e1", source: "iot-sensors", target: "data-ingestion" },
    { id: "e2", source: "data-ingestion", target: "normalization" },
    { id: "e3", source: "normalization", target: "polars-processing" },
    { id: "e4", source: "normalization", target: "duckdb-query" },
    { id: "e5", source: "normalization", target: "ai-analysis" },
    { id: "e6", source: "polars-processing", target: "vector-embeddings" },
    { id: "e7", source: "duckdb-query", target: "visualization" },
    { id: "e8", source: "ai-analysis", target: "visualization" },
    { id: "e9", source: "vector-embeddings", target: "api-response" },
    { id: "e10", source: "visualization", target: "api-response" },
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
