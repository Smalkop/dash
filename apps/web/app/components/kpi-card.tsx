import type { ReactNode } from "react";
import { clsx } from "clsx";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  color?: "brand" | "green" | "red" | "amber";
}

const colorMap = {
  brand: "bg-brand-50 text-brand-700 border-brand-200",
  green: "bg-green-50 text-green-700 border-green-200",
  red: "bg-red-50 text-red-700 border-red-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
};

export function KpiCard({ title, value, subtitle, icon, color = "brand" }: KpiCardProps) {
  return (
    <div className={clsx("rounded-xl border p-5", colorMap[color])}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium opacity-80">{title}</span>
        {icon && <span className="opacity-60">{icon}</span>}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && <div className="text-xs mt-1 opacity-60">{subtitle}</div>}
    </div>
  );
}
