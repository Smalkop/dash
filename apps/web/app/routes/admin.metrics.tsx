import { useState, useEffect } from "react";
import { apiGet, apiPost, type PaginatedResponse } from "../lib/api";
import { KpiCard } from "../components/kpi-card";
import { TimeseriesChart } from "../components/timeseries-chart";
import { RefreshCw, Activity, Cpu, DollarSign, Users, Zap, AlertTriangle } from "lucide-react";

export default function AdminMetricsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [freeTier, setFreeTier] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const [clientsRes, freeTierRes] = await Promise.all([
        apiGet<PaginatedResponse<any>>("/clients"),
        apiGet<any>("/metrics/free-tier"),
      ]);
      setClients(clientsRes.data);
      setFreeTier(freeTierRes);
      const metricsRes = await apiGet<any>("/metrics/summary");
      setMetrics(metricsRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMetrics(); }, []);

  const syncMetrics = async () => {
    setSyncing(true);
    setSyncMsg("");
    try {
      const res = await apiPost<any>("/metrics/sync");
      setSyncMsg(`Sincronizado: ${res.synced} recursos, ${res.errors} errores`);
      loadMetrics();
    } catch (err) {
      setSyncMsg("Error al sincronizar");
    } finally {
      setSyncing(false);
    }
  };

  const ft = freeTier?.freeTier || {};

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Métricas Globales</h1>
          <p className="text-sm text-slate-500 mt-0.5">Resumen de consumo de todos los clientes</p>
        </div>
        <button onClick={syncMetrics} disabled={syncing} className="btn-primary">
          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Sincronizando..." : "Sincronizar"}
        </button>
      </div>

      {syncMsg && (
        <div className="mb-4 p-3 bg-indigo-50 text-indigo-700 text-sm rounded-lg border border-indigo-100">{syncMsg}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="loading-spinner" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KpiCard title="Total Requests" value={(metrics?.summary?.total_requests ?? 0).toLocaleString()} icon={<Activity className="w-4 h-4" />} />
            <KpiCard title="CPU Time" value={`${((metrics?.summary?.total_cpu_ms ?? 0) / 1000).toFixed(0)}s`} icon={<Cpu className="w-4 h-4" />} />
            <KpiCard title="Costo Real" value={`$${((metrics?.summary?.total_cost_cents ?? 0) / 100).toFixed(2)}`} icon={<DollarSign className="w-4 h-4" />} />
            <KpiCard title="Clientes" value={clients.length} icon={<Users className="w-4 h-4" />} />
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="stat-label">Estado del Free Tier</span>
                {ft.exceeded ? (
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                ) : (
                  <Zap className="w-4 h-4 text-amber-500" />
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">Requests diarios</span>
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
                <span className="stat-label">Costo Imputado (Free Tier)</span>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="stat-value">${((metrics?.summary?.total_imputed_cost_cents ?? 0) / 100).toFixed(2)}</div>
              <p className="text-xs text-slate-400 mt-1">
                Lo que costaría este consumo sin el tier gratuito
              </p>
              <div className="mt-3 p-2 bg-amber-50 rounded-lg text-xs text-amber-700">
                <span className="font-medium">Ahorro estimado:</span> $
                {(
                  ((metrics?.summary?.total_imputed_cost_cents ?? 0) -
                    (metrics?.summary?.total_cost_cents ?? 0)) /
                  100
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
                  <span className="text-slate-500">Usado hoy</span>
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

          <div className="card p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Consumo Diario (últimos 30 días)</h3>
            <TimeseriesChart
              data={metrics?.daily || []}
              lines={[
                { dataKey: "requests_count", name: "Requests", color: "#6366f1" },
                { dataKey: "cost_cents", name: "Costo real (cents)", color: "#10b981" },
                { dataKey: "imputed_cost_cents", name: "Costo imputado (cents)", color: "#f59e0b" },
              ]}
            />
          </div>
        </>
      )}
    </div>
  );
}
