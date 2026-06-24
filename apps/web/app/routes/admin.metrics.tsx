import { useState, useEffect } from "react";
import { apiGet, apiPost, type PaginatedResponse } from "../lib/api";
import { KpiCard } from "../components/kpi-card";
import { TimeseriesChart } from "../components/timeseries-chart";
import { RefreshCw, Activity } from "lucide-react";

export default function AdminMetricsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<number | "all">("all");
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
        <h1 className="text-2xl font-bold">Métricas Globales</h1>
        <button onClick={syncMetrics} disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? "Sincronizando..." : "Sincronizar métricas"}
        </button>
      </div>

      {syncMsg && <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">{syncMsg}</div>}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-8">
            <KpiCard title="Total Requests" value={(metrics?.summary?.total_requests ?? 0).toLocaleString()} icon={<Activity className="w-4 h-4" />} />
            <KpiCard title="CPU Time Total (ms)" value={(metrics?.summary?.total_cpu_ms ?? 0).toLocaleString()} color="green" />
            <KpiCard title="Costo Total" value={`$${((metrics?.summary?.total_cost_cents ?? 0) / 100).toFixed(2)}`} color="amber" />
            <KpiCard title="Clientes" value={clients.length} color="brand" />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold mb-4">Consumo Diario (últimos 30 días)</h3>
            <TimeseriesChart
              data={metrics?.daily || []}
              lines={[
                { dataKey: "requests_count", name: "Requests", color: "#3b82f6" },
                { dataKey: "cost_cents", name: "Costo (cents)", color: "#f59e0b" },
              ]}
            />
          </div>
        </>
      )}
    </div>
  );
}
