import { useState, useEffect } from "react";
import { apiGet } from "../lib/api";
import { KpiCard } from "../components/kpi-card";
import { TimeseriesChart } from "../components/timeseries-chart";
import { TopResources } from "../components/top-resources";
import { Activity, Cpu, DollarSign, Server } from "lucide-react";

export default function ClientDashboardPage() {
  const [summary, setSummary] = useState<any>(null);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryRes, resourcesRes] = await Promise.all([
        apiGet<any>("/metrics/summary"),
        apiGet<any>("/metrics/by-resource"),
      ]);
      setSummary(summaryRes);
      setResources(resourcesRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const s = summary?.summary || {};
  const daily = summary?.daily || [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <KpiCard
          title="Requests del mes"
          value={(s.total_requests ?? 0).toLocaleString()}
          icon={<Activity className="w-4 h-4" />}
        />
        <KpiCard
          title="CPU Time"
          value={`${((s.total_cpu_ms ?? 0) / 1000).toFixed(1)}s`}
          icon={<Cpu className="w-4 h-4" />}
          color="green"
        />
        <KpiCard
          title="Costo estimado"
          value={`$${((s.total_cost_cents ?? 0) / 100).toFixed(2)}`}
          icon={<DollarSign className="w-4 h-4" />}
          color="amber"
        />
        <KpiCard
          title="Workers activos"
          value={resources.length}
          icon={<Server className="w-4 h-4" />}
          color="brand"
        />
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold mb-4">Consumo Diario (30 días)</h3>
          <TimeseriesChart
            data={daily}
            lines={[
              { dataKey: "requests_count", name: "Requests", color: "#3b82f6" },
              { dataKey: "cost_cents", name: "Costo ($)", color: "#f59e0b" },
            ]}
          />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold mb-4">Top Recursos</h3>
          <TopResources resources={resources} />
        </div>
      </div>
    </div>
  );
}
