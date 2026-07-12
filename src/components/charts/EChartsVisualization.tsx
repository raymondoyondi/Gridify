import React, { useMemo } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import {
  BarChart,
  HeatmapChart,
  LineChart,
  ScatterChart,
  TreemapChart,
} from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { TelemetryData, Widget } from "../../types";

/**
 * Fine-grained ECharts tree-shaking.
 *
 * Instead of importing the monolithic `echarts` (which bundles every chart type
 * and component), we build the bundle from `echarts/core` and register *only*
 * the exact modules the dashboard uses: Line, Bar, Scatter, Heatmap and
 * Treemap charts plus the Grid / Tooltip / VisualMap components and the Canvas
 * renderer. Rollup then drops the rest of ECharts from the chunk — a much
 * smaller download than the old `echarts-for-react` default import.
 */
echarts.use([
  LineChart,
  BarChart,
  ScatterChart,
  HeatmapChart,
  TreemapChart,
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
  CanvasRenderer,
]);

interface EChartsVisualizationProps {
  widget: Widget;
  telemetry: TelemetryData;
}

const EChartsVisualization: React.FC<EChartsVisualizationProps> = ({
  widget,
  telemetry,
}) => {
  const option = useMemo(() => {
    switch (widget.type) {
      case "line":
        return createLineChartOption(telemetry);
      case "bar":
        return createBarChartOption(telemetry);
      case "heatmap":
        return createHeatmapOption(telemetry);
      case "scatter":
        return createScatterOption(telemetry);
      case "treemap":
        return createTreemapOption(telemetry);
      default:
        return {};
    }
  }, [widget.type, telemetry]);

  return (
    <div className="echarts-container">
      <ReactEChartsCore
        echarts={echarts}
        option={option}
        style={{ height: "100%", width: "100%" }}
        notMerge={true}
        lazyUpdate={false}
      />
    </div>
  );
};

function createLineChartOption(telemetry: TelemetryData) {
  const timestamps = telemetry.temperatureHistory?.map((d: any) => d.label) || [];
  const tempValues = telemetry.temperatureHistory?.map((d: any) => d.value) || [];

  return {
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      borderColor: "#14b8a6",
      textStyle: { color: "#fff" },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      top: "6%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: timestamps,
      boundaryGap: false,
      axisLine: { lineStyle: { color: "#d1d5db" } },
      axisLabel: { color: "#6b7280" },
    },
    yAxis: {
      type: "value",
      axisLine: { lineStyle: { color: "#d1d5db" } },
      axisLabel: { color: "#6b7280" },
      splitLine: { lineStyle: { color: "#e5e7eb" } },
    },
    series: [
      {
        name: "Temperature (°C)",
        type: "line",
        data: tempValues,
        smooth: true,
        itemStyle: { color: "#14b8a6" },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(20, 184, 166, 0.3)" },
              { offset: 1, color: "rgba(20, 184, 166, 0)" },
            ],
          },
        },
      },
    ],
  };
}

function createBarChartOption(telemetry: TelemetryData) {
  const devices = telemetry.devices?.map((d: any) => d.id) || [];
  const humidity = telemetry.devices?.map((d: any) => d.humidity) || [];

  return {
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      borderColor: "#8b5cf6",
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      top: "6%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: devices,
      axisLine: { lineStyle: { color: "#d1d5db" } },
      axisLabel: { color: "#6b7280" },
    },
    yAxis: {
      type: "value",
      axisLine: { lineStyle: { color: "#d1d5db" } },
      axisLabel: { color: "#6b7280" },
      splitLine: { lineStyle: { color: "#e5e7eb" } },
    },
    series: [
      {
        name: "Humidity (%)",
        type: "bar",
        data: humidity,
        itemStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "#8b5cf6" },
              { offset: 1, color: "#a78bfa" },
            ],
          },
        },
        showBackground: true,
        backgroundStyle: { color: "rgba(180, 180, 180, 0.1)" },
      },
    ],
  };
}

function createHeatmapOption(telemetry: TelemetryData) {
  const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const data: [number, number, number][] = [];

  for (let i = 0; i < days.length; i++) {
    for (let j = 0; j < hours.length; j++) {
      data.push([j, i, Math.floor(Math.random() * 100)]);
    }
  }

  return {
    tooltip: { position: "top" },
    grid: { top: "10%", right: "10%", bottom: "10%", left: "10%" },
    xAxis: { type: "category", data: hours },
    yAxis: { type: "category", data: days },
    visualMap: {
      min: 0,
      max: 100,
      calculable: true,
      orient: "vertical",
      right: "10",
      top: "center",
      inRange: {
        color: ["#00467F", "#A5CC82"],
      },
    },
    series: [
      {
        name: "Activity",
        type: "heatmap",
        data: data,
        emphasis: { itemStyle: { borderColor: "#333", borderWidth: 1 } },
      },
    ],
  };
}

function createScatterOption(telemetry: TelemetryData) {
  const data = telemetry.devices?.map((d: any) => [d.temperature, d.humidity]) || [];

  return {
    tooltip: { trigger: "item" },
    grid: { left: "10%", right: "10%", bottom: "10%", top: "10%" },
    xAxis: {
      type: "value",
      name: "Temperature (°C)",
      splitLine: { show: false },
      axisLabel: { color: "#6b7280" },
    },
    yAxis: {
      type: "value",
      name: "Humidity (%)",
      splitLine: { show: false },
      axisLabel: { color: "#6b7280" },
    },
    series: [
      {
        name: "Device Metrics",
        type: "scatter",
        data: data,
        symbolSize: 8,
        itemStyle: {
          color: "#14b8a6",
          opacity: 0.6,
        },
        emphasis: { itemStyle: { color: "#0d9488", opacity: 1 } },
      },
    ],
  };
}

function createTreemapOption(telemetry: TelemetryData) {
  const devices = telemetry.devices || [];
  const treeData = {
    name: "Devices",
    children: devices.map((d: any) => ({
      name: d.id,
      value: d.temperature || 1,
    })),
  };

  return {
    tooltip: { trigger: "item", formatter: "{b}: {c}" },
    series: [
      {
        type: "treemap",
        data: [treeData],
        breadcrumb: { show: true },
        label: { show: true },
        itemStyle: {
          borderColor: "#fff",
          borderWidth: 2,
        },
        levels: [
          { itemStyle: { borderColor: "#d1d5db", borderWidth: 1 } },
          {
            itemStyle: {
              borderColor: "#f0f9ff",
              borderWidth: 2,
              gapWidth: 1,
            },
            label: { show: false },
          },
        ],
      },
    ],
  };
}

export default EChartsVisualization;
