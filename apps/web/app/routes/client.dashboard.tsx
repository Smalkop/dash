import { useState, useEffect } from "react";
import { apiGet } from "../lib/api";
import { KpiCard } from "../components/kpi-card";
import { TimeseriesChart } from "../components/timeseries-chart";
import { TopResources } from "../components/top-resources";
import { Activity, Cpu, DollarSign, Server, Zap, AlertTriangle } from "lucide-react";

export default function ClientDashboardPage() {
  const [summary, setSummary] = useState<any>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [freeTier, setFreeTier] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryRes, resourcesRes, freeTierRes] = await Promise.all([
        apiGet<any>("/metrics/summary"),
        apiGet<any>("/metrics/by-resource"),
        apiGet<any>("/metrics/free-tier"),
      ]);
      setSummary(summaryRes);
      setResources(resourcesRes);
      setFreeTier(freeTierRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="loading-spinner" /></div>;
  }

  const s = summary?.summary || {};
  const daily = summary?.daily || [];
  const ft = freeTier?.freeTier || {};

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard title="Requests del mes" value={(s.total_requests ?? 0).toLocaleString()} icon={<Activity className="w-4 h-4" />} />
        <KpiCard title="CPU Time" value={`${((s.total_cpu_ms ?? 0) / 1000).toFixed(1)}s`} icon={<Cpu className="w-4 h-4" />} />
        <KpiCard title="Costo estimado" value={`$${((s.total_cost_cents ?? 0) / 100).toFixed(2)}`} icon={<DollarSign className="w-4 h-4" />} />
        <KpiCard title="Workers activos" value={resources.length} icon={<Server className="w-4 h-4" />} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="stat-label">Free Tier Hoy</span>
            {ft.exceeded ? (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            ) : (
              <Zap className="w-4 h-4 text-amber-500" />
            )}
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-600">Requests</span>
                <span className="font-medium text-slate-900">
                  {ft.requestsUsed?.toLocaleString()} / {ft.requestsLimit?.toLocaleString()}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    ft.usagePercent && ft.usagePercent > 90
                      ? "bg-red-500"
                      : ft.usagePercent && ft.usagePercent > 70
                      ? "bg-amber-500"
                      : "bg-indigo-500"
                  }`}
                  style={{ width: `${Math.min(ft.usagePercent ?? 0, 100)}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-50 rounded-lg p-2">
                <span className="text-slate-500">Uso</span>
                <p className="font-semibold text-slate-900">{ft.usagePercent ?? 0}%</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2">
                <span className="text-slate-500">Restantes</span>
                <p className="font-semibold text-slate-900">{ft.requestsRemaining?.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="stat-label">Costo Imputado</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="stat-value">${((s.total_imputed_cost_cents ?? 0) / 100).toFixed(2)}</div>
          <p className="text-xs text-slate-400 mt-1">
            Lo que costaría sin el tier gratuito
          </p>
          <div className="mt-3 p-2 bg-amber-50 rounded-lg text-xs text-amber-700">
            <span className="font-medium">Ahorro free tier:</span> $
            {(
              ((s.total_imputed_cost_cents ?? 0) - (s.total_cost_cents ?? 0)) / 100
            ).toFixed(2)}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="stat-label">CPU Free Tier</span>
            <Cpu className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">CPU usado</span>
              <span className="font-medium text-slate-900">{((ft.cpuMsUsed ?? 0) / 1000).toFixed(1)}s</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Presupuesto free</span>
              <span className="font-medium text-slate-900">{((ft.cpuMsLimit ?? 0) / 1000).toFixed(0)}s</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Restante</span>
              <span className="font-medium text-slate-900">{((ft.cpuMsRemaining ?? 0) / 1000).toFixed(1)}s</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 card p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Consumo Diario (30 días)</h3>
          <TimeseriesChart
            data={daily}
            lines={[
              { dataKey: "requests_count", name: "Requests", color: "#6366f1" },
              { dataKey: "cost_cents", name: "Costo real ($)", color: "#10b981" },
              { dataKey: "imputed_cost_cents", name: "Costo imputado ($)", color: "#f59e0b" },
            ]}
          />
        </div>
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Top Recursos</h3>
          <TopResources resources={resources} />
        </div>
      </div>
    </div>
  );
}
