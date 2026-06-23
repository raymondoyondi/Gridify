import React, { useState, useRef } from "react";
import { motion } from "motion/react";
import { Widget, Device, ChartDataPoint } from "../types";
import { DashboardChart } from "./DashboardCharts";
import { 
  GripVertical, 
  Cpu, 
  Globe, 
  Server, 
  TrendingUp, 
  Info, 
  RotateCcw, 
  Sparkles,
  CheckCircle,
  HelpCircle,
  BarChart2,
  Trash2,
  Zap
} from "lucide-react";

interface DragDropGridProps {
  widgets: Widget[];
  setWidgets: (widgets: Widget[]) => void;
  telemetry: {
    devices: Device[];
    temperatureHistory: ChartDataPoint[];
    humidityHistory: ChartDataPoint[];
  };
  aiBulletSummaries: string[];
  onActionClick: (actionText: string) => void;
  onRemoveWidget: (id: string) => void;
}

export default function DragDropGrid({ 
  widgets, 
  setWidgets, 
  telemetry, 
  aiBulletSummaries, 
  onActionClick,
  onRemoveWidget
}: DragDropGridProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
    
    // Create a ghost image / styling hint
    const dragImg = new Image();
    dragImg.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    e.dataTransfer.setDragImage(dragImg, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const updated = [...widgets];
      const draggedItem = updated[draggedIndex];
      // Splice swap
      updated.splice(draggedIndex, 1);
      updated.splice(dragOverIndex, 0, draggedItem);
      
      // Update orders
      const reordered = updated.map((item, i) => ({ ...item, order: i }));
      setWidgets(reordered);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" id="dashboard-widgets-grid">
      {widgets
        .sort((a, b) => a.order - b.order)
        .map((widget, index) => {
          const isDragging = draggedIndex === index;
          const isDragOver = dragOverIndex === index;
          const colSpan = widget.w === 4 
            ? "md:col-span-2 lg:col-span-4" 
            : widget.w === 3 
              ? "md:col-span-2 lg:col-span-3" 
              : widget.w === 2 
                ? "md:col-span-2 lg:col-span-2" 
                : "md:col-span-1 lg:col-span-1";

          return (
            <motion.div
              key={widget.id}
              id={`widget-container-${widget.id}`}
              layout
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              onDragOver={(e) => handleDragOver(e, index)}
              className={`${colSpan} relative rounded-2xl transition-all duration-200 ${
                isDragging ? "opacity-30 scale-95 border-2 border-dashed border-teal-300" : ""
              } ${isDragOver ? "ring-2 ring-teal-500/50 scale-[1.01]" : ""}`}
            >
              {/* Card container with dragging handles */}
              <div className="group relative h-full bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all duration-300">
                {/* Visual drag grip handle */}
                <div 
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnd={handleDragEnd}
                  className="absolute top-4 right-4 text-slate-300 hover:text-slate-600 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-50 transition-colors opacity-0 group-hover:opacity-100 z-20"
                  title="Drag to rearrange"
                >
                  <GripVertical className="w-4 h-4" />
                </div>

                {/* Optional delete button for dynamic widgets */}
                {widget.id.startsWith("custom_") && (
                  <button
                    onClick={() => onRemoveWidget(widget.id)}
                    className="absolute top-4 right-10 text-rose-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100 z-20"
                    title="Remove custom widget"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                {/* Render specific Widget Contents */}
                {widget.type === "line" && (
                  <DashboardChart
                    data={telemetry.temperatureHistory}
                    title={widget.title}
                    subtitle={widget.subtitle}
                    type="line"
                    color="teal"
                  />
                )}

                {widget.type === "bar" && (
                  <DashboardChart
                    data={telemetry.humidityHistory}
                    title={widget.title}
                    subtitle={widget.subtitle}
                    type="bar"
                    color="blue"
                    ySuffix="%"
                  />
                )}

                {widget.type === "status" && (
                  <div className="h-full flex flex-col justify-between" id="status-widget-layout">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-display font-semibold text-slate-800 text-sm tracking-tight">{widget.title}</h3>
                        <span className="bg-slate-50 text-[10px] font-semibold text-slate-500 px-2 py-0.5 rounded-full border border-slate-100">
                          3 Devices Connected
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mb-5">{widget.subtitle}</p>

                      {/* Status indicator items */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="devices-status-grid">
                        {/* Device 01: Host */}
                        <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden group/dev hover:shadow-sm hover:scale-[1.02] transition-all">
                          <div className="absolute right-2 top-2 text-emerald-500/10">
                            <Server className="w-10 h-10" />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="font-semibold text-xs text-slate-700">Device 01: Host</span>
                          </div>
                          <span className="text-[10px] text-emerald-600 font-medium bg-emerald-100/40 px-2 py-0.5 rounded-full w-max">
                            Active Operational State
                          </span>
                        </div>

                        {/* Device 02: Proxy */}
                        <div className="bg-sky-50/40 border border-sky-100 rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden group/dev hover:shadow-sm hover:scale-[1.02] transition-all">
                          <div className="absolute right-2 top-2 text-sky-500/10">
                            <Globe className="w-10 h-10" />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" />
                            <span className="font-semibold text-xs text-slate-700">Device 02: Proxy</span>
                          </div>
                          <span className="text-[10px] text-sky-600 font-medium bg-sky-100/40 px-2 py-0.5 rounded-full w-max">
                            Active Flow Controller
                          </span>
                        </div>

                        {/* Device 03: Node */}
                        <div className="bg-amber-50/40 border border-amber-100 rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden group/dev hover:shadow-sm hover:scale-[1.02] transition-all">
                          <div className="absolute right-2 top-2 text-amber-500/10">
                            <Cpu className="w-10 h-10" />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                            <span className="font-semibold text-xs text-slate-700">Device 03: Node</span>
                          </div>
                          <span className="text-[10px] text-amber-600 font-medium bg-amber-100/40 px-2 py-0.5 rounded-full w-max">
                            Indicated Alert Stage
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {widget.type === "summary" && (
                  <div className="flex flex-col h-full justify-between" id="summary-widget-layout">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-display font-semibold text-slate-800 text-sm tracking-tight">{widget.title}</h3>
                        <span className="bg-teal-50 text-[10px] font-mono font-semibold text-teal-600 px-2 py-0.5 rounded border border-teal-100">
                          IoT Analytics Key
                        </span>
                      </div>
                      
                      <div className="mt-4" id="ai-insight-bullets">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-2">
                          KEY SUMMARIES
                        </span>
                        <ul className="space-y-2.5">
                          {aiBulletSummaries.map((bullet, i) => (
                            <li key={i} className="flex gap-2 text-xs text-slate-600 leading-relaxed">
                              <span className="text-teal-500 font-semibold mt-0.5 flex-shrink-0">•</span>
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Small inline table metrics */}
                      <div className="mt-6 overflow-x-auto border border-slate-50 rounded-xl" id="summary-inline-table">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                              <th className="p-3 text-[10px] font-semibold text-slate-400 tracking-wider">Year / Location</th>
                              <th className="p-3 text-[10px] font-semibold text-slate-400 tracking-wider text-right">Sensor Load</th>
                              <th className="p-3 text-[10px] font-semibold text-slate-400 tracking-wider text-right">Humidity %</th>
                              <th className="p-3 text-[10px] font-semibold text-slate-400 tracking-wider text-right">Total Load</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors">
                              <td className="p-3 text-xs font-semibold text-slate-700">Home Hub</td>
                              <td className="p-3 text-xs font-mono text-slate-500 text-right">26.78</td>
                              <td className="p-3 text-xs font-semibold text-teal-600 text-right">48%</td>
                              <td className="p-3 text-xs font-mono text-slate-500 text-right">2.3K</td>
                            </tr>
                            <tr className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors">
                              <td className="p-3 text-xs font-semibold text-slate-700">Male Hub</td>
                              <td className="p-3 text-xs font-mono text-slate-500 text-right">27.53</td>
                              <td className="p-3 text-xs font-semibold text-teal-600 text-right">93%</td>
                              <td className="p-3 text-xs font-mono text-slate-500 text-right">6.7K</td>
                            </tr>
                            <tr className="hover:bg-slate-50/30 transition-colors">
                              <td className="p-3 text-xs font-semibold text-slate-700">Marchival Arc</td>
                              <td className="p-3 text-xs font-mono text-slate-500 text-right">41.53</td>
                              <td className="p-3 text-xs font-semibold text-teal-600 text-right">42%</td>
                              <td className="p-3 text-xs font-mono text-slate-500 text-right">4.8K</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {widget.type === "actions" && (
                  <div className="flex flex-col h-full justify-between" id="actions-widget-layout">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-display font-semibold text-slate-800 text-sm tracking-tight">{widget.title}</h3>
                        <span className="bg-purple-50 text-[10px] font-semibold text-purple-600 px-2 py-0.5 rounded-full border border-purple-100 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 animate-pulse" /> Natural Language
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mb-5">{widget.subtitle}</p>

                      <div className="space-y-3" id="quick-layout-actions">
                        <button
                          id="action-btn-sync"
                          onClick={() => onActionClick("Synchronize Temperature and Humidity Graphs")}
                          className="w-full text-left bg-teal-500/5 hover:bg-teal-500/10 border border-teal-500/10 hover:border-teal-500/20 text-teal-700 text-xs font-medium px-4 py-3 rounded-xl flex items-center justify-between group transition-all duration-200"
                        >
                          <span>Synchronize Temperature and Humidity Graphs</span>
                          <span className="text-teal-500 group-hover:translate-x-1 transition-transform font-bold">→</span>
                        </button>
                        
                        <button
                          id="action-btn-correlation"
                          onClick={() => onActionClick("Show Telemetry Correlation Plot")}
                          className="w-full text-left bg-sky-500/5 hover:bg-sky-500/10 border border-sky-500/10 hover:border-sky-500/20 text-sky-700 text-xs font-medium px-4 py-3 rounded-xl flex items-center justify-between group transition-all duration-200"
                        >
                          <span>Show Telemetry Correlation Plot</span>
                          <span className="text-sky-500 group-hover:translate-x-1 transition-transform font-bold">→</span>
                        </button>

                        <button
                          id="action-btn-restore"
                          onClick={() => onActionClick("Restore General Executive Dashboard Layout")}
                          className="w-full text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium px-4 py-3 rounded-xl flex items-center justify-between group transition-all duration-200"
                        >
                          <span>Restore General Executive Dashboard Layout</span>
                          <span className="text-slate-500 group-hover:translate-x-1 transition-transform font-bold">→</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {widget.type === "custom_chart" && widget.customData && (
                  <div className="h-full flex flex-col justify-between" id={`custom-chart-${widget.id}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-display font-semibold text-slate-800 text-sm tracking-tight flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-amber-500 fill-amber-400" />
                          {widget.title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">{widget.subtitle}</p>
                      </div>
                      <span className="bg-amber-50 border border-amber-100 text-[10px] font-mono text-amber-700 font-semibold px-2 py-0.5 rounded">
                        AI Generated
                      </span>
                    </div>

                    <div className="flex-1 min-h-[220px]">
                      {/* Dynamically rendering custom chart data using our SVG DashboardChart component with Blue theme */}
                      <DashboardChart
                        data={widget.customData.labels.map((label, idx) => ({
                          label,
                          value: widget.customData!.values[idx]
                        }))}
                        title=""
                        subtitle=""
                        type="area"
                        color="blue"
                        ySuffix={widget.customData.yAxisLabel || ""}
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
    </div>
  );
}
