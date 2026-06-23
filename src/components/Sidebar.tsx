import { useState } from "react";
import { 
  Home,
  LayoutGrid, 
  LayoutDashboard, 
  BarChart3, 
  Database, 
  TrendingUp, 
  FileText, 
  FileSpreadsheet, 
  Settings, 
  ChevronDown, 
  ChevronUp 
} from "lucide-react";
import { motion } from "motion/react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const [summariesOpen, setSummariesOpen] = useState(false);

  const mainNavItems = [
    { id: "landing", label: "Home", icon: Home },
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "charts", label: "Charts", icon: BarChart3 },
    { id: "dashboards", label: "Dashboards", icon: Database },
    { id: "analytics", label: "Analytics", icon: TrendingUp },
  ];

  const bottomNavItems = [
    { id: "report", label: "Report", icon: FileSpreadsheet },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-100 flex flex-col h-screen sticky top-0" id="sidebar-container">
      {/* Brand Logo */}
      <div className="p-6 border-b border-slate-50 flex items-center gap-3" id="sidebar-logo-container">
        <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600 shadow-sm" id="brand-logo-icon">
          <LayoutGrid className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-display font-bold text-lg text-slate-800 tracking-tight" id="brand-name">Gridify</h1>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto" id="sidebar-nav">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative ${
                isActive 
                  ? "text-teal-600 bg-teal-50/50" 
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 top-2 bottom-2 w-1 bg-teal-500 rounded-r-lg"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <Icon className={`w-4.5 h-4.5 ${isActive ? "text-teal-600" : "text-slate-400 group-hover:text-slate-600"}`} />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Summaries Dropdown Header */}
        <div>
          <button
            id="nav-item-summaries-header"
            onClick={() => setSummariesOpen(!summariesOpen)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-4.5 h-4.5 text-slate-400" />
              <span>Summaries</span>
            </div>
            {summariesOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>

          {/* Summaries Submenu */}
          {summariesOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="pl-9 pr-2 py-1 space-y-1"
              id="sidebar-summaries-submenu"
            >
              <button 
                id="submenu-device-health"
                onClick={() => setActiveTab("summary-device")}
                className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg block transition-colors ${
                  activeTab === "summary-device" ? "text-teal-600 bg-teal-50/30" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                }`}
              >
                Device Health Summary
              </button>
              <button 
                id="submenu-load-metrics"
                onClick={() => setActiveTab("summary-load")}
                className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg block transition-colors ${
                  activeTab === "summary-load" ? "text-teal-600 bg-teal-50/30" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                }`}
              >
                Load Analysis Report
              </button>
            </motion.div>
          )}
        </div>
      </nav>

      {/* Bottom Profile / Settings */}
      <div className="p-4 border-t border-slate-100 space-y-1" id="sidebar-bottom">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? "text-teal-600 bg-teal-50/50" 
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <Icon className={`w-4.5 h-4.5 ${isActive ? "text-teal-600" : "text-slate-400"}`} />
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* User Card */}
        <div className="flex items-center gap-3 px-4 py-4 mt-2 border-t border-slate-50" id="user-profile-card">
          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-display font-semibold text-slate-700 text-sm border border-slate-100">
            RO
          </div>
          <div className="overflow-hidden">
            <h4 className="font-semibold text-xs text-slate-800 truncate leading-none">Raymond Oyondi</h4>
            <span className="text-[10px] text-slate-400 truncate block mt-1">Administrator</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
