import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  Zap,
  TrendingUp,
  BarChart3,
} from "lucide-react"

interface ServiceStatus {
  name: string
  status: "healthy" | "degraded" | "error"
  latency: number
  uptime: number
  icon: React.ReactNode
}

interface MonitoringDashboardProps {
  title?: string
}

const MonitoringDashboard: React.FC<MonitoringDashboardProps> = ({
  title = "System Monitoring",
}) => {
  const [services, setServices] = useState<ServiceStatus[]>([
    {
      name: "API Server",
      status: "healthy",
      latency: 45,
      uptime: 99.9,
      icon: <Zap className="w-5 h-5" />,
    },
    {
      name: "DuckDB Engine",
      status: "healthy",
      latency: 12,
      uptime: 99.99,
      icon: <Database className="w-5 h-5" />,
    },
    {
      name: "AI/LLM Service",
      status: "degraded",
      latency: 2500,
      uptime: 98.5,
      icon: <Activity className="w-5 h-5" />,
    },
    {
      name: "Redis Cache",
      status: "healthy",
      latency: 8,
      uptime: 99.99,
      icon: <Zap className="w-5 h-5" />,
    },
    {
      name: "Vector DB",
      status: "healthy",
      latency: 35,
      uptime: 99.95,
      icon: <BarChart3 className="w-5 h-5" />,
    },
  ])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-emerald-50 border-emerald-200 text-emerald-700"
      case "degraded":
        return "bg-amber-50 border-amber-200 text-amber-700"
      case "error":
        return "bg-red-50 border-red-200 text-red-700"
      default:
        return "bg-slate-50 border-slate-200 text-slate-700"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="w-4 h-4 text-emerald-600" />
      case "degraded":
        return <AlertCircle className="w-4 h-4 text-amber-600" />
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-600" />
      default:
        return null
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100 },
    },
  }

  return (
    <div className="monitoring-dashboard space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Clock className="w-4 h-4" />
          <span>Real-time monitoring</span>
        </div>
      </div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence>
          {services.map((service, idx) => (
            <motion.div
              key={service.name}
              variants={itemVariants}
              exit={{ opacity: 0, y: -20 }}
              className={`border rounded-lg p-4 ${getStatusColor(service.status)}`}
              whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">{service.icon}</span>
                      <h3 className="font-semibold text-sm">{service.name}</h3>
                    </div>
                    <p className="text-xs opacity-75">
                      {service.status === "healthy" && "All systems operational"}
                      {service.status === "degraded" && "Operating with delays"}
                      {service.status === "error" && "Service unavailable"}
                    </p>
                  </div>
                  <motion.div
                    animate={{ rotate: service.status === "healthy" ? [0, 10, 0] : 0 }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {getStatusIcon(service.status)}
                  </motion.div>
                </div>

                <div className="space-y-2 pt-2 border-t border-current/10">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">Latency</span>
                    <span className="font-mono font-bold">{service.latency}ms</span>
                  </div>
                  <div className="h-1.5 bg-current/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-current/40"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(service.latency / 50, 100)}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>

                  <div className="flex justify-between text-xs mt-2">
                    <span className="font-medium">Uptime</span>
                    <span className="font-mono font-bold">{service.uptime}%</span>
                  </div>
                  <div className="h-1.5 bg-current/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-current/40"
                      initial={{ width: 0 }}
                      animate={{ width: `${service.uptime}%` }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      <motion.div
        className="bg-white border border-slate-200 rounded-lg p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-teal-600" />
          Performance Metrics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Avg Latency", value: "127ms", change: "-12%" },
            { label: "Throughput", value: "8,234 req/s", change: "+8%" },
            { label: "Error Rate", value: "0.02%", change: "-5%" },
            { label: "CPU Usage", value: "42%", change: "+3%" },
          ].map((metric) => (
            <div key={metric.label} className="space-y-2">
              <p className="text-xs text-slate-500 font-medium">{metric.label}</p>
              <p className="text-lg font-bold text-slate-900">{metric.value}</p>
              <p className={`text-xs font-semibold ${
                metric.change.startsWith("+") && metric.label !== "Error Rate"
                  ? "text-red-600"
                  : "text-emerald-600"
              }`}>
                {metric.change}
              </p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

export default MonitoringDashboard
