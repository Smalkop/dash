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
      await apiPost("/alerts/rules", {
        ...form,
        threshold_value: Number(form.threshold_value),
      });
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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Alertas</h1>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Reglas activas</h3>
            <button onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700">
              <Plus className="w-3 h-3" /> Nueva regla
            </button>
          </div>

          {showForm && (
            <form onSubmit={createRule} className="bg-white rounded-xl border border-gray-200 p-4 mb-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Métrica</label>
                <select value={form.metric_type} onChange={(e) => setForm({ ...form, metric_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="requests">Requests</option>
                  <option value="cpu_time">CPU Time</option>
                  <option value="cost">Costo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Comparación</label>
                <select value={form.comparison} onChange={(e) => setForm({ ...form, comparison: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="gt">Mayor que (&gt;)</option>
                  <option value="lt">Menor que (&lt;)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Umbral</label>
                <input type="number" value={form.threshold_value} onChange={(e) => setForm({ ...form, threshold_value: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm" required />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-3 py-1.5 bg-brand-600 text-white rounded text-sm">Crear</button>
                <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 bg-gray-100 rounded text-sm">Cancelar</button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="text-center py-8 text-gray-400">Cargando...</div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Sin reglas configuradas</div>
          ) : (
            <div className="space-y-2">
              {rules.map((r: any) => (
                <div key={r.id} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{r.metric_type} {r.comparison == "gt" ? ">" : "<"} {r.threshold_value.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">{r.is_active ? "Activa" : "Inactiva"}</p>
                  </div>
                  <button onClick={() => deleteRule(r.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="font-semibold mb-4">Notificaciones</h3>
          {loading ? (
            <div className="text-center py-8 text-gray-400">Cargando...</div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              Sin notificaciones
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((n: any) => (
                <div key={n.id} className={`bg-white rounded-lg border p-3 ${n.is_read ? 'border-gray-200' : 'border-brand-200 bg-brand-50'}`}>
                  <p className="text-sm">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
