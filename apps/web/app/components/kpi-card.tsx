import type { ReactNode } from "react";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
}

export function KpiCard({ title, value, subtitle, icon }: KpiCardProps) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="stat-label">{title}</span>
        {icon && <span className="text-slate-400">{icon}</span>}
      </div>
      <div className="stat-value">{value}</div>
      {subtitle && <div className="text-xs text-slate-400 mt-1">{subtitle}</div>}
    </div>
  );
}
