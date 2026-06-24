import { useState, useEffect } from "react";
import { apiGet, apiPost, apiDelete, type PaginatedResponse } from "../lib/api";
import { Plus, Trash2, Server } from "lucide-react";

export default function AdminResourcesPage() {
  const [resources, setResources] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ client_id: "", resource_type: "worker_script", cloudflare_name: "", display_name: "" });

  const loadData = async () => {
    setLoading(true);
    try {
      const [res, clientsRes] = await Promise.all([
        apiGet<PaginatedResponse<any>>("/resources"),
        apiGet<PaginatedResponse<any>>("/clients"),
      ]);
      setResources(res.data);
      setClients(clientsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const createResource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiPost("/resources", { ...form, client_id: Number(form.client_id) });
      setShowForm(false);
      setForm({ client_id: "", resource_type: "worker_script", cloudflare_name: "", display_name: "" });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteResource = async (id: number) => {
    if (!window.confirm("¿Eliminar recurso?")) return;
    try {
      await apiDelete(`/resources/${id}`);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const resourceTypes = ["worker_script", "d1_database", "kv_namespace", "r2_bucket", "durable_object", "workflow"];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Recursos</h1>
          <p className="text-sm text-slate-500 mt-0.5">{resources.length} recursos asignados</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus className="w-4 h-4" /> Asignar recurso
        </button>
      </div>

      {showForm && (
        <form onSubmit={createResource} className="card p-6 mb-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Asignar nuevo recurso</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
              <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className="input" required>
                <option value="">Seleccionar...</option>
                {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
              <select value={form.resource_type} onChange={(e) => setForm({ ...form, resource_type: e.target.value })} className="input">
                {resourceTypes.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre en Cloudflare</label>
              <input type="text" value={form.cloudflare_name} onChange={(e) => setForm({ ...form, cloudflare_name: e.target.value })}
                className="input" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre visible</label>
              <input type="text" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                className="input" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary">Asignar</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="loading-spinner" /></div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="table-header">Cliente</th>
                <th className="table-header">Nombre</th>
                <th className="table-header">Tipo</th>
                <th className="table-header">Estado</th>
                <th className="table-header text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((r: any) => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="table-cell text-slate-500">{clients.find((c: any) => c.id === r.client_id)?.name || `#${r.client_id}`}</td>
                  <td className="table-cell font-medium">{r.display_name || r.cloudflare_name}</td>
                  <td className="table-cell">
                    <span className="badge bg-slate-100 text-slate-700">{r.resource_type.replace(/_/g, " ")}</span>
                  </td>
                  <td className="table-cell">
                    <span className={`badge ${r.is_active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                      {r.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="table-cell text-right">
                    <button onClick={() => deleteResource(r.id)} className="text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {resources.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400 text-sm">
                    <Server className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No hay recursos asignados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
