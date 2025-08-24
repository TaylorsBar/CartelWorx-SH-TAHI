
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { SensorDataPoint } from '../types';

interface SensorChartProps {
  data: SensorDataPoint[];
  lines: { dataKey: keyof SensorDataPoint; stroke: string; name: string }[];
  title: string;
}

const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-base-900/80 backdrop-blur-sm p-2 border border-base-700 rounded-md shadow-lg">
        <p className="label text-sm text-gray-400">{`${new Date(label).toLocaleTimeString()}`}</p>
        {payload.map((pld: any) => (
          <p key={pld.dataKey} style={{ color: pld.color }} className="text-xs">{`${pld.name}: ${pld.value.toFixed(2)}`}</p>
        ))}
      </div>
    );
  }
  return null;
};

const SensorChart: React.FC<SensorChartProps> = ({ data, lines, title }) => {
  return (
    <div className="bg-black p-4 rounded-lg shadow-lg h-80 border border-brand-cyan/30">
      <h3 className="text-lg font-semibold text-gray-200 mb-4 font-display">{title}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 20, left: -10, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#2D2D42" />
          <XAxis 
            dataKey="time" 
            tickFormatter={(time) => new Date(time).toLocaleTimeString()}
            stroke="#7F7F98"
            tick={{fontSize: 12}}
          />
          <YAxis stroke="#7F7F98" tick={{fontSize: 12}} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{fontSize: "14px", bottom: 0}} />
          {lines.map((line) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              name={line.name}
              stroke={line.stroke}
              strokeWidth={2}
              dot={false}
              animationDuration={300}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SensorChart;
