This file documents how to add Recharts and Chart.js to the frontend and contains short example snippets.

Install (from the frontend directory):

npm install recharts chart.js react-chartjs-2

or with yarn:

yarn add recharts chart.js react-chartjs-2

Recharts (example React TSX component):

```tsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

type DataPoint = { name: string; value: number };

const sampleData: DataPoint[] = [
  { name: 'Jan', value: 30 },
  { name: 'Feb', value: 45 },
  { name: 'Mar', value: 60 },
];

export const SimpleRechart = () => (
  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={sampleData}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Line type="monotone" dataKey="value" stroke="#8884d8" />
    </LineChart>
  </ResponsiveContainer>
);
```

Chart.js (React wrapper example):

```tsx
import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export const SimpleChartJS = () => {
  const data = {
    labels: ['Jan', 'Feb', 'Mar'],
    datasets: [
      {
        label: 'Example dataset',
        data: [30, 45, 60],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
      },
    ],
  };

  return <Line data={data} />;
};
```
