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
  };
}

interface TopResourcesProps {
  resources: ResourceUsage[];
}

export function TopResources({ resources }: TopResourcesProps) {
  if (!resources || resources.length === 0) {
    return <div className="text-sm text-gray-400 text-center py-8">Sin recursos registrados</div>;
  }

  const sorted = [...resources].sort((a, b) => b.usage.estimated_cost_cents - a.usage.estimated_cost_cents);

  return (
    <div className="space-y-3">
      {sorted.slice(0, 5).map((r) => (
        <div key={r.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100">
          <div className="flex items-center gap-3">
            <Server className="w-4 h-4 text-brand-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">{r.display_name || r.cloudflare_name}</p>
              <p className="text-xs text-gray-400">{r.resource_type.replace("_", " ")}</p>
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="font-medium">${(r.usage.estimated_cost_cents / 100).toFixed(2)}</p>
            <p className="text-xs text-gray-400">{r.usage.requests_count.toLocaleString()} reqs</p>
          </div>
        </div>
      ))}
    </div>
  );
}
