import { Server } from "lucide-react";

interface ResourceUsage {
  id: number;
  cloudflare_name: string;
  display_name: string | null;
  resource_type: string;
  usage: {
    requests_count: number;
    cpu_time_ms: number;
    estimated_cost_cents: number;
    imputed_cost_cents?: number;
  };
}

interface TopResourcesProps {
  resources: ResourceUsage[];
}

export function TopResources({ resources }: TopResourcesProps) {
  if (!resources || resources.length === 0) {
    return <div className="text-sm text-slate-400 text-center py-8">Sin recursos registrados</div>;
  }

  const sorted = [...resources].sort((a, b) => {
    const aCost = a.usage.imputed_cost_cents ?? a.usage.estimated_cost_cents;
    const bCost = b.usage.imputed_cost_cents ?? b.usage.estimated_cost_cents;
    return bCost - aCost;
  });

  return (
    <div className="space-y-2">
      {sorted.slice(0, 5).map((r, i) => {
        const imputed = r.usage.imputed_cost_cents ?? r.usage.estimated_cost_cents;
        return (
          <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs font-semibold text-slate-400 w-4 shrink-0">{i + 1}</span>
              <Server className="w-4 h-4 text-indigo-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{r.display_name || r.cloudflare_name}</p>
                <p className="text-xs text-slate-400">{r.resource_type.replace(/_/g, " ")}</p>
              </div>
            </div>
            <div className="text-right text-sm shrink-0 ml-3">
              <p className="font-semibold text-slate-900">${(imputed / 100).toFixed(2)}</p>
              <p className="text-xs text-slate-400">{r.usage.requests_count.toLocaleString()} reqs</p>
              {r.usage.estimated_cost_cents === 0 && imputed > 0 && (
                <p className="text-[10px] text-emerald-500">free tier</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
