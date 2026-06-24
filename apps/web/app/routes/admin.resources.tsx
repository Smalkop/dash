import { useState, useEffect } from "react";
import { apiGet, apiPost, apiDelete, type PaginatedResponse } from "../lib/api";
import { Plus, Trash2 } from "lucide-react";

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
    if (!confirm("¿Eliminar recurso?")) return;
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
        <h1 className="text-2xl font-bold">Recursos</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition text-sm">
          <Plus className="w-4 h-4" /> Asignar recurso
        </button>
      </div>

      {showForm && (
        <form onSubmit={createResource} className="bg-white rounded-xl border border-gray-200 p-6 mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" required>
                <option value="">Seleccionar...</option>
                {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select value={form.resource_type} onChange={(e) => setForm({ ...form, resource_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm">
                {resourceTypes.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre en Cloudflare</label>
              <input type="text" value={form.cloudflare_name} onChange={(e) => setForm({ ...form, cloudflare_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre visible</label>
              <input type="text" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm">Asignar</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm">Cancelar</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Cliente</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Nombre</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Tipo</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Estado</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Acción</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((r: any) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{clients.find((c: any) => c.id === r.client_id)?.name || `Cliente #${r.client_id}`}</td>
                  <td className="px-4 py-3 text-sm font-medium">{r.display_name || r.cloudflare_name}</td>
                  <td className="px-4 py-3"><span className="px-2 py-1 bg-gray-100 rounded text-xs">{r.resource_type}</span></td>
                  <td className="px-4 py-3 text-sm">{r.is_active ? "Activo" : "Inactivo"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => deleteResource(r.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
