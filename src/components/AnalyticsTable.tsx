import { useState } from "react";
import { Device } from "../types";
import { Sparkline, AreaSparkline } from "./DashboardCharts";
import { Search, Server, Cpu, Globe, ArrowUpRight, ArrowDownRight, AlertTriangle } from "lucide-react";
import { motion } from "motion/react";

interface AnalyticsTableProps {
  devices: Device[];
  bulletSummaries: string[];
}

export default function AnalyticsTable({ devices, bulletSummaries }: AnalyticsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSegment, setActiveSegment] = useState<"table" | "bento" | "distribution">("table");

  // Filter devices based on search query
  const filteredDevices = devices.filter((dev) =>
    dev.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dev.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper values for KPI cards
  const uptimeHistory = [20, 25, 23, 28, 30, 29, 35, 42, 38, 45, 50];
  const costHistory = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  const loadHistory = [12, 14, 15, 13, 17, 18, 16, 19, 21, 20, 23];
  const activeHistory = [22, 23, 23, 23, 22, 23, 24, 23, 23, 23, 23];

  return (
    <div className="space-y-6" id="analytics-table-view">
      {/* Search and Segment Control */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm" id="analytics-search-controls">
        {/* Search input */}
        <div className="relative flex-1" id="search-input-wrapper">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="analytics-search-devices"
            type="text"
            placeholder="Filter devices (e.g. Home, Server, Device 03...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs font-medium border border-slate-100 rounded-xl bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white transition-all"
          />
        </div>

        {/* Segmented Toggle controls */}
        <div className="flex bg-slate-50 border border-slate-100 p-1 rounded-xl" id="analytics-segmented-toggles">
          <button
            id="toggle-analytics-table"
            onClick={() => setActiveSegment("table")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeSegment === "table" 
                ? "bg-white text-slate-800 shadow-sm" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Analytics Table
          </button>
          <button
            id="toggle-bento-cards"
            onClick={() => setActiveSegment("bento")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeSegment === "bento" 
                ? "bg-white text-slate-800 shadow-sm" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Bento Grid Cards
          </button>
          <button
            id="toggle-perf-dist"
            onClick={() => setActiveSegment("distribution")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeSegment === "distribution" 
                ? "bg-white text-slate-800 shadow-sm" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Performance Distribution
          </button>
        </div>
      </div>

      {/* Main View Area based on segment */}
      {activeSegment === "table" && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6" id="analytics-table-workspace">
          {/* Section title */}
          <div>
            <h2 className="font-display font-bold text-slate-800 text-lg tracking-tight">BUSINESS ANALYTICS SUMMARY</h2>
            <p className="text-xs text-slate-400 mt-1">Real-time device uptime and loading metrics aggregate representation</p>
          </div>

          {/* Key summaries block */}
          <div className="bg-slate-50/40 border border-slate-100/50 rounded-2xl p-5" id="analytics-table-summaries-list">
            <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 block mb-3">KEY SUMMARIES</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bulletSummaries.map((summary, idx) => (
                <div key={idx} className="flex gap-2.5 text-xs text-slate-600 leading-relaxed">
                  <span className="text-teal-500 font-bold">•</span>
                  <span>{summary}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Devices Grid Table */}
          <div className="overflow-x-auto border border-slate-50 rounded-2xl" id="analytics-full-table">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="p-4 text-[10px] font-semibold text-slate-400 tracking-wider">Device ID</th>
                  <th className="p-4 text-[10px] font-semibold text-slate-400 tracking-wider">Type / Role</th>
                  <th className="p-4 text-[10px] font-semibold text-slate-400 tracking-wider text-right">Performance Score</th>
                  <th className="p-4 text-[10px] font-semibold text-slate-400 tracking-wider text-right">Uptime %</th>
                  <th className="p-4 text-[10px] font-semibold text-slate-400 tracking-wider text-right">Average Load</th>
                  <th className="p-4 text-[10px] font-semibold text-slate-400 tracking-wider text-center">Trend Sparkline</th>
                </tr>
              </thead>
              <tbody>
                {filteredDevices.map((dev) => {
                  // Status dot style
                  const dotColor = dev.status === "operational" 
                    ? "bg-emerald-500" 
                    : dev.status === "flow_controller" 
                      ? "bg-sky-500" 
                      : "bg-amber-500";

                  const uptimeColor = dev.uptime >= 85 
                    ? "text-emerald-600 bg-emerald-50" 
                    : dev.uptime >= 45 
                      ? "text-sky-600 bg-sky-50" 
                      : "text-rose-600 bg-rose-50";

                  // Static sparkline values based on device load values
                  const isUpTrend = dev.score > 30;
                  const sparkValues = isUpTrend 
                    ? [10, 15, 12, 18, 16, 22, 28, 25, 30] 
                    : [35, 32, 28, 22, 24, 18, 15, 19, 14];

                  return (
                    <tr key={dev.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors" id={`device-row-${dev.id.replace(/\s+/g, '-').toLowerCase()}`}>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                          <span className="font-semibold text-xs text-slate-800">{dev.id}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-xs text-slate-500">{dev.type}</span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-mono text-xs text-slate-600">{dev.score.toFixed(2)}</span>
                      </td>
                      <td className="p-4 text-right">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${uptimeColor}`}>
                          {dev.uptime}%
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-mono text-xs text-slate-600">{dev.load}</span>
                      </td>
                      <td className="p-4 flex items-center justify-center">
                        <Sparkline values={sparkValues} trend={isUpTrend ? "up" : "down"} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredDevices.length === 0 && (
              <div className="p-8 text-center" id="empty-search-state">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">No telemetry devices found matching your query.</p>
                <button 
                  onClick={() => setSearchQuery("")} 
                  className="text-xs text-teal-600 hover:underline mt-2 font-semibold"
                >
                  Clear search filter
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSegment === "bento" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="analytics-bento-grid">
          {filteredDevices.map((dev) => {
            const Icon = dev.type === "Host" ? Server : dev.type === "Proxy" ? Globe : Cpu;
            const statusLabel = dev.status === "operational" 
              ? "Active Operational" 
              : dev.status === "flow_controller" 
                ? "Active Flow Controller" 
                : "Indicated Alert Stage";

            const statusColor = dev.status === "operational"
              ? "bg-emerald-500 border-emerald-100 text-emerald-700 bg-emerald-50/50"
              : dev.status === "flow_controller"
                ? "bg-sky-500 border-sky-100 text-sky-700 bg-sky-50/50"
                : "bg-amber-500 border-amber-100 text-amber-700 bg-amber-50/50";

            return (
              <motion.div
                key={dev.id}
                layout
                className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500">
                      <Icon className="w-5.5 h-5.5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-xs text-slate-800">{dev.id}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{dev.type} Node</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusColor}`}>
                    {statusLabel}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-50 text-center">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Score</span>
                    <span className="font-mono text-xs font-semibold text-slate-700 mt-1 block">{dev.score.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Uptime</span>
                    <span className="font-mono text-xs font-semibold text-slate-700 mt-1 block">{dev.uptime}%</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Avg Load</span>
                    <span className="font-mono text-xs font-semibold text-slate-700 mt-1 block">{dev.load}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {activeSegment === "distribution" && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6" id="analytics-distribution-view">
          <div>
            <h2 className="font-display font-bold text-slate-800 text-sm tracking-tight">Node Load and Score Distribution</h2>
            <p className="text-xs text-slate-400 mt-1">Comparing node loading factors across Marchival, Home, and Server nodes</p>
          </div>

          <div className="space-y-4" id="distribution-bars-container">
            {filteredDevices.map((dev) => {
              const pct = (dev.score / 50) * 100;
              const barColor = dev.status === "operational" ? "bg-teal-500" : dev.status === "flow_controller" ? "bg-sky-500" : "bg-amber-500";
              return (
                <div key={dev.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{dev.id}</span>
                    <span className="font-mono text-slate-400">Score Factor: {dev.score.toFixed(2)}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-50 border border-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${barColor}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, pct)}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom KPI Sparlines Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="analytics-sparklines-row">
        {/* KPI 1 */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all flex items-center justify-between group" id="kpi-total-uptime">
          <div>
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Total Uptime</span>
            <h4 className="font-display font-bold text-slate-800 text-lg mt-1 group-hover:text-teal-600 transition-colors">3h 10m Uptime</h4>
          </div>
          <div>
            <AreaSparkline values={uptimeHistory} color="teal" />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all flex items-center justify-between group" id="kpi-operational-cost">
          <div>
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Operational Cost</span>
            <h4 className="font-display font-bold text-slate-800 text-lg mt-1 group-hover:text-blue-600 transition-colors">$0.00 / USD</h4>
          </div>
          <div>
            <AreaSparkline values={costHistory} color="blue" />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all flex items-center justify-between group" id="kpi-active-balancers">
          <div>
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Active Devices</span>
            <h4 className="font-display font-bold text-slate-800 text-lg mt-1 group-hover:text-emerald-600 transition-colors">18 Devices</h4>
          </div>
          <div>
            <AreaSparkline values={loadHistory} color="emerald" />
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all flex items-center justify-between group" id="kpi-monitored-nodes">
          <div>
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Total Node Count</span>
            <h4 className="font-display font-bold text-slate-800 text-lg mt-1 group-hover:text-amber-600 transition-colors">23 Devices</h4>
          </div>
          <div>
            <AreaSparkline values={activeHistory} color="amber" />
          </div>
        </div>
      </div>
    </div>
  );
}
