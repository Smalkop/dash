import { useState, useEffect } from "react";
import { apiGet, apiPost, apiDelete } from "../lib/api";
import { Bell, Plus, Trash2 } from "lucide-react";

export default function ClientAlertsPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ metric_type: "requests", threshold_value: "", comparison: "gt" });

  const loadData = async () => {
    setLoading(true);
    try {
      const [rulesRes, notifRes] = await Promise.all([
        apiGet<any[]>("/alerts/rules"),
        apiGet<any[]>("/alerts/notifications"),
      ]);
      setRules(rulesRes);
      setNotifications(notifRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const createRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiPost("/alerts/rules", { ...form, threshold_value: Number(form.threshold_value) });
      setShowForm(false);
      setForm({ metric_type: "requests", threshold_value: "", comparison: "gt" });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteRule = async (id: number) => {
    try {
      await apiDelete(`/alerts/rules/${id}`);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const comparisonLabels: Record<string, string> = { gt: "> mayor que", lt: "< menor que", gte: "≥ mayor o igual", lte: "≤ menor o igual" };
  const metricLabels: Record<string, string> = { requests: "Requests", cpu_time: "CPU Time", cost: "Costo" };

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-6">Alertas</h1>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="loading-spinner" /></div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Reglas activas</h3>
              <button onClick={() => setShowForm(!showForm)} className="btn-secondary text-xs px-3 py-1.5">
                <Plus className="w-3 h-3" /> Nueva regla
              </button>
            </div>

            {showForm && (
              <form onSubmit={createRule} className="card p-4 mb-4 space-y-3">
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">Nueva regla</h4>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Métrica</label>
                  <select value={form.metric_type} onChange={(e) => setForm({ ...form, metric_type: e.target.value })} className="input text-xs">
                    <option value="requests">Requests</option>
                    <option value="cpu_time">CPU Time</option>
                    <option value="cost">Costo</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Condición</label>
                    <select value={form.comparison} onChange={(e) => setForm({ ...form, comparison: e.target.value })} className="input text-xs">
                      {Object.entries(comparisonLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Valor umbral</label>
                    <input type="number" value={form.threshold_value} onChange={(e) => setForm({ ...form, threshold_value: e.target.value })}
                      className="input text-xs" required />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="submit" className="btn-primary text-xs px-3 py-1.5">Crear</button>
                  <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-xs px-3 py-1.5">Cancelar</button>
                </div>
              </form>
            )}

            {rules.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                Sin reglas configuradas
              </div>
            ) : (
              <div className="space-y-2">
                {rules.map((r: any) => (
                  <div key={r.id} className="card px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{metricLabels[r.metric_type] || r.metric_type}</p>
                      <p className="text-xs text-slate-500">{comparisonLabels[r.comparison] || r.comparison} {r.threshold_value}</p>
                    </div>
                    <button onClick={() => deleteRule(r.id)} className="text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Notificaciones</h3>
            {notifications.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                Sin notificaciones
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((n: any) => (
                  <div key={n.id} className="card px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="badge bg-indigo-50 text-indigo-700 text-xs">{n.severity || "info"}</span>
                      <span className="text-xs text-slate-400">{n.created_at ? new Date(n.created_at).toLocaleDateString() : ""}</span>
                    </div>
                    <p className="text-sm text-slate-700 mt-1">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
