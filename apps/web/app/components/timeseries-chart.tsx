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

export function TimeseriesChart({ data, lines, height = 280 }: TimeseriesChartProps) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Sin datos disponibles</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }}
          tickFormatter={(val: string) => { const p = val.split("-"); return p.length === 3 ? `${p[2]}/${p[1]}` : val; }} />
        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
        <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }} />
        <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
        {lines.map((line) => (
          <Line key={line.dataKey} type="monotone" dataKey={line.dataKey} name={line.name}
            stroke={line.color} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
