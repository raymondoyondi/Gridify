export interface Device {
  id: string;
  score: number;
  uptime: number;
  load: string;
  status: "operational" | "alert" | "flow_controller";
  type: string;
  active: boolean;
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface WidgetCustomData {
  labels: string[];
  values: number[];
  yAxisLabel?: string;
}

export interface Widget {
  id: string;
  title: string;
  subtitle: string;
  type: "line" | "bar" | "status" | "summary" | "actions" | "custom_chart";
  w: number; // grid columns span (1 to 4 or 1 to 12 depending on grid config)
  h?: number; // visual height in pixels
  order: number; // sort ordering
  customData?: WidgetCustomData;
}

export interface TelemetryData {
  devices: Device[];
  temperatureHistory: ChartDataPoint[];
  humidityHistory: ChartDataPoint[];
}
