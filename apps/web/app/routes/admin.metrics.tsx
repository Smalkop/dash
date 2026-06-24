import { useState, useEffect } from "react";
import { apiGet, apiPost, type PaginatedResponse } from "../lib/api";
import { KpiCard } from "../components/kpi-card";
import { TimeseriesChart } from "../components/timeseries-chart";
import { RefreshCw, Activity, Cpu, DollarSign, Users } from "lucide-react";

export default function AdminMetricsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const [clientsRes] = await Promise.all([
        apiGet<PaginatedResponse<any>>("/clients"),
      ]);
      setClients(clientsRes.data);
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
            <KpiCard title="Costo Total" value={`$${((metrics?.summary?.total_cost_cents ?? 0) / 100).toFixed(2)}`} icon={<DollarSign className="w-4 h-4" />} />
            <KpiCard title="Clientes" value={clients.length} icon={<Users className="w-4 h-4" />} />
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Consumo Diario (últimos 30 días)</h3>
            <TimeseriesChart
              data={metrics?.daily || []}
              lines={[
                { dataKey: "requests_count", name: "Requests", color: "#6366f1" },
                { dataKey: "cost_cents", name: "Costo (cents)", color: "#f59e0b" },
              ]}
            />
          </div>
        </>
      )}
    </div>
  );
}
