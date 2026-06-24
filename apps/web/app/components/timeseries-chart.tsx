import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface DataPoint {
  date: string;
  requests?: number;
  cost?: number;
  cpuTime?: number;
}

interface TimeseriesChartProps {
  data: DataPoint[];
  lines: Array<{
    dataKey: string;
    name: string;
    color: string;
  }>;
  height?: number;
}

export function TimeseriesChart({ data, lines, height = 300 }: TimeseriesChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Sin datos disponibles
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          tickFormatter={(val: string) => {
            const parts = val.split("-");
            return parts.length === 3 ? `${parts[2]}/${parts[1]}` : val;
          }}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        {lines.map((line) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            name={line.name}
            stroke={line.color}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
