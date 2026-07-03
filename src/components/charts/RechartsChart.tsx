import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export type Point = { x: string | number; y: number; [key: string]: any };

interface RechartsChartProps {
  data: Point[];
  xKey?: string;
  yKey?: string;
  height?: number;
  color?: string;
}

const RechartsChart: React.FC<RechartsChartProps> = ({
  data,
  xKey = 'x',
  yKey = 'y',
  height = 300,
  color = '#8884d8',
}) => {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey={yKey} stroke={color} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RechartsChart;
