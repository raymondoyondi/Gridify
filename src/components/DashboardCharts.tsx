import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { ChartDataPoint } from "../types";
import { ArrowDownRight, ArrowUpRight, TrendingUp } from "lucide-react";

interface ChartProps {
  data: ChartDataPoint[];
  title: string;
  subtitle: string;
  type: "line" | "bar" | "area";
  color?: string;
  ySuffix?: string;
}

export function DashboardChart({ data, title, subtitle, type: initialType, color = "teal", ySuffix = "" }: ChartProps) {
  const [chartType, setChartType] = useState<"line" | "bar" | "area">(initialType);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 500, height: 220 });

  // Dynamically watch container size for fluid responsiveness
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width } = entry.contentRect;
        setDimensions({
          width: Math.max(width - 40, 300),
          height: 220
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  if (!data || data.length === 0) return null;

  const { width, height } = dimensions;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxVal = Math.max(...data.map(d => d.value)) * 1.15;
  const minVal = 0; // standard floor for clarity

  // Compute SVG Coordinates
  const points = data.map((d, i) => {
    const x = paddingLeft + (i / (data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - ((d.value - minVal) / (maxVal - minVal)) * chartHeight;
    return { x, y, label: d.label, value: d.value };
  });

  // Construct SVG Path for Line / Area
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;

  // Colors mapping
  const strokeColor = color === "blue" ? "#0284c7" : "#0d9488"; // sky-600 vs teal-600
  const fillColor = color === "blue" ? "url(#blue-gradient)" : "url(#teal-gradient)";

  return (
    <div ref={containerRef} className="w-full bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col" id={`chart-${title.replace(/\s+/g, '-').toLowerCase()}`}>
      <div className="flex items-center justify-between mb-4" id="chart-header">
        <div>
          <h3 className="font-display font-semibold text-slate-800 text-sm tracking-tight">{title}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        
        {/* Layout Switcher Dropdown */}
        <div className="relative" id="chart-type-selector">
          <select
            id={`chart-select-type-${title.replace(/\s+/g, '-').toLowerCase()}`}
            value={chartType}
            onChange={(e) => setChartType(e.target.value as any)}
            className="text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer transition-all"
          >
            <option value="line">Line Chart</option>
            <option value="bar">Bar Layout</option>
            <option value="area">Area Chart</option>
          </select>
        </div>
      </div>

      {/* SVG Container */}
      <div className="relative flex-1 min-h-[220px]" id="svg-chart-workspace">
        <svg width={width} height={height} className="overflow-visible">
          <defs>
            <linearGradient id="teal-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d9488" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0d9488" stopOpacity="0.00" />
            </linearGradient>
            <linearGradient id="blue-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((val, i) => {
            const y = paddingTop + val * chartHeight;
            const gridVal = maxVal - val * (maxVal - minVal);
            return (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  fill="#94a3b8"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  {Math.round(gridVal)}{ySuffix}
                </text>
              </g>
            );
          })}

          {/* Render Area chart background if selected */}
          {chartType === "area" && (
            <motion.path
              d={areaPath}
              fill={fillColor}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            />
          )}

          {/* Render Line chart path */}
          {(chartType === "line" || chartType === "area") && (
            <motion.path
              d={linePath}
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          )}

          {/* Render Bar chart elements */}
          {chartType === "bar" && (
            <g>
              {points.map((p, i) => {
                const barWidth = Math.min(24, chartWidth / data.length * 0.5);
                const barHeight = paddingTop + chartHeight - p.y;
                return (
                  <motion.rect
                    key={i}
                    x={p.x - barWidth / 2}
                    y={p.y}
                    width={barWidth}
                    height={barHeight}
                    rx="4"
                    fill={strokeColor}
                    opacity={hoveredIndex === i ? 1 : 0.85}
                    initial={{ scaleY: 0, y: paddingTop + chartHeight }}
                    animate={{ scaleY: 1, y: p.y }}
                    style={{ transformOrigin: "bottom" }}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className="cursor-pointer transition-all duration-200"
                  />
                );
              })}
            </g>
          )}

          {/* Line Chart Dots */}
          {(chartType === "line" || chartType === "area") && points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={hoveredIndex === i ? "6" : "4"}
              fill="white"
              stroke={strokeColor}
              strokeWidth="2.5"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="cursor-pointer transition-all duration-200"
            />
          ))}

          {/* X Axis Labels */}
          {points.map((p, i) => (
            <text
              key={i}
              x={p.x}
              y={paddingTop + chartHeight + 18}
              fill="#94a3b8"
              fontSize="10"
              fontFamily="sans-serif"
              textAnchor="middle"
            >
              {p.label}
            </text>
          ))}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredIndex !== null && points[hoveredIndex] && (
          <div
            className="absolute bg-slate-900 text-white rounded-lg px-2.5 py-1.5 text-[10px] font-mono shadow-md pointer-events-none transform -translate-x-1/2 -translate-y-full z-10"
            style={{
              left: `${points[hoveredIndex].x}px`,
              top: `${points[hoveredIndex].y - 8}px`,
            }}
          >
            <div className="font-semibold text-white/90">{points[hoveredIndex].label}</div>
            <div className="text-teal-400 mt-0.5">{points[hoveredIndex].value.toFixed(1)}{ySuffix}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// Sparkline helper for tables and small analytics panels
export function Sparkline({ values, trend, width = 64, height = 24 }: { values: number[], trend: "up" | "down", width?: number, height?: number }) {
  if (!values || values.length === 0) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const pointsPath = values.map((val, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 4) - 2;
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");

  const color = trend === "up" ? "#0d9488" : "#ef4444"; // teal vs red

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path
        d={pointsPath}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Sparkline area chart for stats cards
export function AreaSparkline({ values, color = "teal", width = 120, height = 40 }: { values: number[], color?: "teal" | "blue" | "emerald" | "amber", width?: number, height?: number }) {
  if (!values || values.length === 0) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const linePoints = values.map((val, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 6) - 3;
    return { x, y };
  });

  const linePath = linePoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const fillPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  const strokeColor = color === "blue" ? "#0284c7" : color === "emerald" ? "#10b981" : color === "amber" ? "#f59e0b" : "#0d9488";
  const gradId = `spark-grad-${color}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.2" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
