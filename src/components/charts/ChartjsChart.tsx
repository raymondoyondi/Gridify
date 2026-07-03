import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export type Point = { x: string | number; y: number; [key: string]: any };

interface ChartjsChartProps {
  data: Point[];
  xKey?: string;
  yKey?: string;
  height?: number; // px
  color?: string;
  fill?: boolean;
  options?: ChartOptions<'line'>;
}

const ChartjsChart: React.FC<ChartjsChartProps> = ({
  data,
  xKey = 'x',
  yKey = 'y',
  height = 300,
  color = 'rgba(136,132,216,0.8)',
  fill = false,
  options,
}) => {
  const chartData = useMemo(() => {
    const labels = data.map((d) => String((d as any)[xKey]));
    const values = data.map((d) => Number((d as any)[yKey] ?? 0));
    return {
      labels,
      datasets: [
        {
          label: yKey,
          data: values,
          fill,
          backgroundColor: color,
          borderColor: color,
          tension: 0.3,
        },
      ],
    };
  }, [data, xKey, yKey, color, fill]);

  const defaultOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false },
      title: { display: false },
    },
    interaction: { mode: 'nearest', axis: 'x', intersect: false },
    scales: {
      x: { display: true },
      y: { display: true, beginAtZero: false },
    },
  };

  return (
    <div style={{ width: '100%', height }}>
      <div style={{ height: '100%' }}>
        <Line data={chartData} options={{ ...defaultOptions, ...options }} />
      </div>
    </div>
  );
};

export default ChartjsChart;
