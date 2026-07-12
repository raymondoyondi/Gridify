import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import DragDropGrid from "./components/DragDropGrid";
import AnalyticsTable from "./components/AnalyticsTable";
import { useDashboardStore } from "./store/dashboardStore";
import { LazyECharts, LazyDataPipelineFlow } from "./components/charts/LazyCharts";
import ArrowTelemetry from "./components/ArrowTelemetry";
import DuckDBAnalytics from "./components/DuckDBAnalytics";
import RagSearch from "./components/RagSearch";
import {
  Search,
  Sparkles,
  Bell,
  User,
  HelpCircle,
  X,
  CheckCircle,
  Loader2,
  Settings,
  FileSpreadsheet,
  RefreshCw,
  Cpu,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [activeTab, setActiveTab] = useState("landing");

  // Dashboard state now lives in the Zustand store so the grid, summaries,
  // and status stay in sync without prop-drilling through the tree.
  const widgets = useDashboardStore((s) => s.widgets);
  const setWidgets = useDashboardStore((s) => s.setWidgets);
  const telemetry = useDashboardStore((s) => s.telemetry);
  const setTelemetry = useDashboardStore((s) => s.setTelemetry);
  const aiBulletSummaries = useDashboardStore((s) => s.aiBulletSummaries);
  const systemStatus = useDashboardStore((s) => s.systemStatus);
  const searchChips = useDashboardStore((s) => s.searchChips);
  const addChip = useDashboardStore((s) => s.addChip);
  const removeChipFromStore = useDashboardStore((s) => s.removeChip);
  const applyCommandResult = useDashboardStore((s) => s.applyCommandResult);
  const resetLayout = useDashboardStore((s) => s.resetLayout);
  const removeWidgetFromStore = useDashboardStore((s) => s.removeWidget);

  // Search box + transient UI state stays local to the component.
  const [aiQuery, setAiQuery] = useState("");

  // API loader & toast
  const [isGenerating, setIsGenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const recommendations = [
    { text: "Show me last month's temperature trends as an area chart", short: "Show me last month's temperature trends as an area chart" },
    { text: "Filter metrics for Device 03", short: "Filter metrics for Device 03" },
    { text: "Summarize system load efficiency", short: "Summarize system load efficiency" },
    { text: "Toggle humidity chart focus", short: "Toggle humidity chart focus" }
  ];

  // Fetch initial telemetry data from Express backend
  useEffect(() => {
    async function loadTelemetry() {
      try {
        const response = await fetch("/api/telemetry");
        if (response.ok) {
          const data = await response.json();
          setTelemetry(data);
        }
      } catch (err) {
        console.error("Failed to load initial backend telemetry:", err);
      }
    }
    loadTelemetry();
  }, []);

  // Show a temporary toast message helper
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Handle submitting query to backend Gemini engine
  const handleGeminiSubmit = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsGenerating(true);

    try {
      const response = await fetch("/api/gemini/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryText,
          currentWidgets: widgets
        })
      });

      if (response.ok) {
        const result = await response.json();

        // Push the whole command result into the store in one action.
        applyCommandResult(result);
        if (result.feedbackMessage) {
          triggerToast(result.feedbackMessage);
        }

        // Add a temporary chip indicating active query filters
        const cleanQuery = queryText.length > 20 ? queryText.slice(0, 20) + "..." : queryText;
        addChip(cleanQuery);
      } else {
        triggerToast("Failed to process command with backend server.");
      }
    } catch (err) {
      console.error("Gemini submit query error:", err);
      triggerToast("Failed to connect to full-stack Gemini service.");
    } finally {
      setIsGenerating(false);
      setAiQuery("");
    }
  };

  // Remove active filtering chip
  const removeChip = (chipToRemove: string) => {
    removeChipFromStore(chipToRemove);
    triggerToast(`Removed view filter: "${chipToRemove}"`);
  };

  // Reset dashboard to default layout
  const resetDashboardLayout = () => {
    resetLayout();
    triggerToast("Dashboard workspace layout restored successfully.");
  };

  // Quick actions button trigger
  const handleQuickAction = (actionText: string) => {
    if (actionText.includes("Restore")) {
      resetDashboardLayout();
    } else {
      handleGeminiSubmit(actionText);
    }
  };

  // Remove dynamic custom charts
  const handleRemoveWidget = (widgetId: string) => {
    removeWidgetFromStore(widgetId);
    triggerToast("Widget removed from active workspace.");
  };

  return (
    <div className="flex bg-slate-50 min-h-screen text-slate-800 font-sans" id="gridify-app-root">
      
      {/* Toast Notification Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-6 left-1/2 z-50 bg-slate-900/95 backdrop-blur-md border border-slate-800 text-white rounded-2xl px-5 py-3.5 shadow-xl flex items-center gap-3 max-w-md w-full"
            id="toast-notification"
          >
            <div className="w-8 h-8 rounded-full bg-teal-500/10 text-teal-400 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div className="flex-1">
              <h5 className="text-[10px] uppercase font-bold text-teal-400 tracking-wider">AI Layout Engine</h5>
              <p className="text-xs text-slate-100 font-medium mt-0.5">{toastMessage}</p>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white transition-colors p-1">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Workspace Frame */}
      <main className="flex-1 overflow-y-auto h-screen flex flex-col" id="workspace-main-frame">
        
        {/* Workspace Top Header */}
        <header className="bg-white border-b border-slate-100 px-8 py-4.5 flex items-center justify-between sticky top-0 z-30" id="workspace-header">
          <div className="flex items-center gap-3">
            <h2 className="font-display font-bold text-slate-800 text-lg capitalize tracking-tight" id="workspace-title">
              {activeTab === "landing" && "Welcome to Gridify"}
              {activeTab === "dashboard" && "Dashboard & Insights"}
              {activeTab === "charts" && "Business Analytics Summary"}
              {activeTab === "dashboards" && "My Connected Dashboards"}
              {activeTab === "analytics" && "Advanced Performance Analytics"}
              {activeTab === "report" && "System Telemetry Reports"}
              {activeTab === "settings" && "Platform Configuration"}
              {activeTab.startsWith("summary") && "Analytical Summaries & Key Reports"}
            </h2>

            {/* System nominal chip */}
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
              systemStatus === "Nominal" 
                ? "bg-emerald-50 border-emerald-100 text-emerald-600" 
                : "bg-amber-50 border-amber-100 text-amber-600"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${systemStatus === "Nominal" ? "bg-emerald-500" : "bg-amber-500"} animate-pulse`} />
              {systemStatus}
            </span>
          </div>

          {/* Quick Header Utilities */}
          <div className="flex items-center gap-4" id="header-utilities">
            <button className="p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full relative transition-colors" title="System alerts">
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500" />
            </button>
            <div className="h-5 w-px bg-slate-100" />
            <button onClick={resetDashboardLayout} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-teal-600 bg-slate-50 hover:bg-teal-50 border border-slate-100 rounded-xl px-3 py-1.5 transition-all" title="Reload layouts">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Layout</span>
            </button>
          </div>
        </header>

        {/* Workspace Views Wrapper */}
        <div className="flex-1 p-8 overflow-y-auto" id="workspace-viewport">
          
          {/* Landing / Welcome Page */}
          {activeTab === "landing" && (
            <div className="max-w-5xl mx-auto py-8 space-y-12" id="landing-tab-panel">
              {/* Hero Banner Section */}
              <div className="relative rounded-3xl bg-slate-900 overflow-hidden px-8 py-16 md:px-16 md:py-20 shadow-xl" id="landing-hero">
                {/* Decorative gradients */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full filter blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full filter blur-3xl pointer-events-none" />
                
                <div className="relative max-w-2xl space-y-6" id="hero-content">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-xs font-semibold text-teal-400">
                    <Sparkles className="w-3.5 h-3.5" /> Core Workspace Console
                  </span>
                  
                  <h1 className="font-display font-bold text-3xl md:text-5xl text-white tracking-tight leading-tight">
                    Intelligent Telemetry & Live Data <span className="text-teal-400">Orchestration</span>
                  </h1>
                  
                  <p className="text-sm md:text-base text-slate-300 leading-relaxed">
                    Build, rearrange, and customize your analytical layouts effortlessly. Translate complex IoT sensor signals into server-driven takeaways using modern AI model orchestration.
                  </p>

                  <div className="pt-4 flex flex-wrap gap-4" id="hero-actions">
                    <button
                      onClick={() => setActiveTab("dashboard")}
                      className="px-6 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-md shadow-teal-500/10 cursor-pointer"
                    >
                      <span>Launch Dashboard Console</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setActiveTab("analytics")}
                      className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 hover:border-slate-600 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                    >
                      View Advanced Analytics
                    </button>
                  </div>
                </div>
              </div>

              {/* Grid of Key System Capabilities */}
              <div className="space-y-6" id="landing-capabilities-container">
                <div className="text-center md:text-left">
                  <h2 className="font-display font-bold text-slate-800 text-xl tracking-tight">Key Platform Capabilities</h2>
                  <p className="text-xs text-slate-400 mt-1">High fidelity, responsive tools tailored for modern telemetry streams</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="capabilities-grid">
                  {/* Cap 1 */}
                  <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 space-y-4">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-slate-800 text-sm">Dynamic Drag & Drop Layout</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Rearrange individual metric widgets instantly to align with your ongoing investigation. State remains synced automatically.
                    </p>
                  </div>

                  {/* Cap 2 */}
                  <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 space-y-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-slate-800 text-sm">Automated Gemini Commands</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Issue natural language questions to generate dynamic telemetry graphs, filter systems, or run comprehensive load summaries.
                    </p>
                  </div>

                  {/* Cap 3 */}
                  <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 space-y-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-slate-800 text-sm">Performance Distribution</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Monitor host scores, proxy load parameters, and node alerts across all devices with real-time health indicator signals.
                    </p>
                  </div>
                </div>
              </div>

              {/* Mini Stats Preview Deck */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6" id="landing-mini-preview">
                <div className="space-y-2 max-w-sm">
                  <span className="text-[10px] uppercase font-bold text-teal-600 tracking-wider font-mono">Live Node Health</span>
                  <h3 className="font-display font-semibold text-slate-800 text-sm tracking-tight">System Status Summary</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Connected sensors are currently transmitting data within normal bounds. Aggregate performance averages 3h 10m active uptime.
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-4" id="mini-preview-counters">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center min-w-[120px]">
                    <span className="text-[10px] text-slate-400 font-mono block">OPERATIONAL NODES</span>
                    <span className="font-display font-bold text-slate-800 text-base mt-1 block">9 Devices</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center min-w-[120px]">
                    <span className="text-[10px] text-slate-400 font-mono block">ACTIVE ALERTS</span>
                    <span className="font-display font-bold text-amber-600 text-base mt-1 block">1 Node</span>
                  </div>
                  <button
                    onClick={() => setActiveTab("dashboard")}
                    className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <span>Inspect Live Stream</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main Dashboard Panel */}
          {activeTab === "dashboard" && (
            <div className="space-y-8" id="dashboard-tab-panel">
              
              {/* Natural Language AI Prompt Box */}
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col gap-4 relative overflow-hidden" id="ai-command-panel">
                
                {/* Visual decoration element */}
                <div className="absolute right-0 top-0 w-32 h-32 bg-teal-500/5 rounded-full filter blur-xl pointer-events-none" />
                
                {/* Search Bar Input */}
                <div className="relative flex items-center" id="search-input-group">
                  <Search className="absolute left-4 w-4.5 h-4.5 text-slate-400" />
                  <input
                    id="dashboard-prompt-input"
                    type="text"
                    placeholder="Type your query, e.g., 'Show me last month's temperature trends as an area chart'"
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGeminiSubmit(aiQuery)}
                    className="w-full pl-11 pr-32 py-3.5 text-xs font-medium bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white transition-all duration-200"
                    disabled={isGenerating}
                  />
                  <button
                    id="btn-generate-view"
                    onClick={() => handleGeminiSubmit(aiQuery)}
                    disabled={isGenerating || !aiQuery.trim()}
                    className="absolute right-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Generate View
                      </>
                    )}
                  </button>
                </div>

                {/* Filter chips listing */}
                {searchChips.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2" id="filter-chips-list">
                    {searchChips.map((chip, idx) => (
                      <div
                        key={idx}
                        className="bg-teal-50/60 border border-teal-100 text-teal-700 text-[10px] font-semibold pl-2.5 pr-1 py-1 rounded-lg flex items-center gap-1.5"
                      >
                        <span>{chip}</span>
                        <button
                          onClick={() => removeChip(chip)}
                          className="hover:bg-teal-100 text-teal-500 hover:text-teal-800 p-0.5 rounded transition-all"
                          title="Clear filter"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recommendation Quick Prompts */}
                <div className="border-t border-slate-50 pt-3" id="recommendations-box">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[11px]">
                    <span className="text-amber-500 font-bold flex items-center gap-1 uppercase tracking-wider font-mono text-[9px]">
                      ✨ RECOMMENDATIONS:
                    </span>
                    {recommendations.map((rec, idx) => (
                      <button
                        key={idx}
                        id={`recommendation-chip-${idx}`}
                        onClick={() => handleGeminiSubmit(rec.text)}
                        disabled={isGenerating}
                        className="text-slate-500 hover:text-teal-600 hover:bg-teal-50 border border-slate-100 hover:border-teal-100 rounded-lg px-2.5 py-1.5 transition-all font-medium text-left cursor-pointer disabled:opacity-50"
                      >
                        {rec.short}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Responsive Drag & Drop Grid workspace */}
              <DragDropGrid
                widgets={widgets}
                setWidgets={setWidgets}
                telemetry={telemetry}
                aiBulletSummaries={aiBulletSummaries}
                onActionClick={handleQuickAction}
                onRemoveWidget={handleRemoveWidget}
              />
            </div>
          )}

          {/* Full Devices Analytics Table & Stats view */}
          {(activeTab === "charts" || activeTab === "analytics") && (
            <div id="analytics-tab-panel" className="space-y-6">
              {/* Zero-copy columnar pipeline: telemetry arrives as a binary
                  Apache Arrow IPC stream, unpacked client-side with no JSON.parse. */}
              <ArrowTelemetry />

              {/* Edge analytics: filtering/sorting/aggregation run locally in a
                  DuckDB-WASM web worker against cached data, off the backend. */}
              <DuckDBAnalytics />

              {/* Hybrid RAG: query embedding + vector matching run in-browser
                  (ONNX) against the cached semantic index before hitting Chroma. */}
              <RagSearch />

              {/* Advanced ECharts visualization — loaded lazily so the ~1MB
                  ECharts bundle is only fetched when this view is opened. */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                <h3 className="font-display font-bold text-slate-800 text-base mb-1">
                  Advanced Interactive Analytics
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Powered by Apache ECharts (code-split, loaded on demand)
                </p>
                <div style={{ height: 320 }}>
                  <LazyECharts
                    widget={{
                      id: "advanced_line",
                      title: "Temperature Trend",
                      subtitle: "",
                      type: "line",
                      w: 4,
                      order: 0,
                    }}
                    telemetry={telemetry}
                  />
                </div>
              </div>

              <AnalyticsTable
                devices={telemetry.devices}
                bulletSummaries={aiBulletSummaries}
              />
            </div>
          )}

          {/* Connected Dashboards list */}
          {activeTab === "dashboards" && (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm space-y-6" id="my-dashboards-panel">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-slate-800 text-base">Connected Analytics Pipelines</h3>
                  <p className="text-xs text-slate-400 mt-1">Manage external telemetry clusters integrated into Gridify</p>
                </div>
                <button className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition-colors">
                  + Connect Cluster
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div className="border border-slate-100 rounded-2xl p-6 hover:shadow-sm transition-all bg-slate-50/20">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                        <Cpu className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-slate-800">EU-West Main IoT</h4>
                        <span className="text-[10px] text-slate-400 font-mono">ID: eu-west-cluster-9</span>
                      </div>
                    </div>
                    <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100">
                      Connected
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">Processing 1,240 events per second telemetry loads from Ireland nodes.</p>
                </div>

                <div className="border border-slate-100 rounded-2xl p-6 hover:shadow-sm transition-all bg-slate-50/20">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
                        <Cpu className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-slate-800">US-West Micro Edge</h4>
                        <span className="text-[10px] text-slate-400 font-mono">ID: us-west-edge-4</span>
                      </div>
                    </div>
                    <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100">
                      Connected
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">Active local backup edge relays, supporting sub-second monitoring queries.</p>
                </div>
              </div>

              {/* Data pipeline visualization — React Flow (+ D3) is loaded
                  lazily so its bundle is excluded from the initial download. */}
              <div className="pt-4">
                <h4 className="font-display font-semibold text-slate-800 text-sm mb-3">
                  Live Data Pipeline
                </h4>
                <LazyDataPipelineFlow title="Gridify Data Pipeline" showMiniMap />
              </div>
            </div>
          )}

          {/* Document Reports View */}
          {activeTab === "report" && (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm space-y-6" id="reports-panel">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-slate-800 text-base">Exportable Executive Reports</h3>
                  <p className="text-xs text-slate-400 mt-1">Export high fidelity summaries or structured telemetry sheets.</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl text-xs transition-colors">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Download CSV</span>
                </button>
              </div>

              <div className="border border-slate-100 rounded-2xl overflow-hidden" id="reports-list">
                {[
                  { name: "Executive Load Balance Report", date: "June 2026", size: "2.4 MB" },
                  { name: "Weekly Device Latency Summary", date: "June 2026", size: "1.8 MB" },
                  { name: "IoT Sensor Temperature Cycle Analytics", date: "May 2026", size: "4.1 MB" }
                ].map((rep, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 border-b border-slate-50 last:border-b-0 hover:bg-slate-50/40 transition-colors">
                    <div>
                      <h4 className="font-semibold text-xs text-slate-800">{rep.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Compiled {rep.date} • {rep.size}</p>
                    </div>
                    <button className="text-xs text-teal-600 hover:underline font-semibold flex items-center gap-1">
                      <span>Download</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submenu health / load report display pages */}
          {activeTab.startsWith("summary") && (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm space-y-6" id="summary-subviews-panel">
              <div>
                <h3 className="font-display font-bold text-slate-800 text-base">
                  {activeTab === "summary-device" ? "Detailed Device Health Summary" : "Comprehensive Load Analysis"}
                </h3>
                <p className="text-xs text-slate-400 mt-1">AI-generated overview compiled directly from live platform socket signals</p>
              </div>

              <div className="border-l-2 border-teal-500 pl-4 space-y-4" id="detailed-summary-text">
                {aiBulletSummaries.map((bullet, idx) => (
                  <div key={idx} className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-teal-600 font-mono">Insight Point 0{idx+1}</span>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">{bullet}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm space-y-6" id="settings-panel">
              <div>
                <h3 className="font-display font-bold text-slate-800 text-base">Platform Configuration</h3>
                <p className="text-xs text-slate-400 mt-1">Adjust telemetry polling weights and Gemini model thresholds.</p>
              </div>

              <div className="space-y-6 max-w-xl" id="settings-form">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 block">Telemetry Sampling Cycle</label>
                  <select className="w-full text-xs font-medium border border-slate-100 bg-slate-50/50 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white transition-all">
                    <option>Real-time (Every 5 seconds)</option>
                    <option>Aggregated (Every 1 minute)</option>
                    <option>Batch mode (Every 10 minutes)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 block">Gemini Analytical Model</label>
                  <select className="w-full text-xs font-medium border border-slate-100 bg-slate-50/50 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white transition-all">
                    <option>gemini-3.5-flash (Standard analytical mode)</option>
                    <option>gemini-3.1-pro-preview (Deep reasoning analytics)</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-slate-50 flex justify-end">
                  <button onClick={() => triggerToast("Successfully updated platform settings configuration.")} className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
