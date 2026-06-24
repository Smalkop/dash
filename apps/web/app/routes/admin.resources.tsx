import { useState, useEffect } from "react";
import { apiGet, apiPost, apiDelete, type PaginatedResponse } from "../lib/api";
import { Plus, Trash2, Server, Search, RefreshCw } from "lucide-react";

export default function AdminResourcesPage() {
  const [resources, setResources] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ client_id: "", resource_type: "worker_script", cloudflare_name: "", display_name: "" });

  const [showDiscover, setShowDiscover] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered] = useState<any[]>([]);
  const [discoveredInfo, setDiscoveredInfo] = useState<any>(null);

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

  const discoverResources = async () => {
    setDiscovering(true);
    try {
      const res = await apiGet<any>("/resources/discover");
      setDiscovered(res.new_resources || []);
      setDiscoveredInfo(res);
      setShowDiscover(true);
    } catch (err) {
      console.error(err);
    } finally {
      setDiscovering(false);
    }
  };

  const addDiscovered = async (item: any) => {
    const clientId = clients.length > 0 ? clients[0].id : null;
    if (!clientId) return;
    try {
      await apiPost("/resources", {
        client_id: clientId,
        resource_type: item.resource_type,
        cloudflare_name: item.cloudflare_name,
        display_name: item.cloudflare_name,
      });
      setDiscovered((prev) => prev.filter((r: any) => r.cloudflare_name !== item.cloudflare_name));
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
        <div className="flex gap-2">
          <button onClick={discoverResources} disabled={discovering} className="btn-secondary">
            <Search className={`w-4 h-4 ${discovering ? "animate-spin" : ""}`} />
            {discovering ? "Descubriendo..." : "Descubrir"}
          </button>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            <Plus className="w-4 h-4" /> Asignar recurso
          </button>
        </div>
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

      {showDiscover && discoveredInfo && (
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Recursos descubiertos en Cloudflare</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {discoveredInfo.total_workers} Workers totales · {discoveredInfo.registered} registrados · {discoveredInfo.unregistered} sin asignar
              </p>
            </div>
            <button onClick={() => setShowDiscover(false)} className="btn-secondary text-xs px-3 py-1.5">Cerrar</button>
          </div>
          {discovered.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-50" />
              Todos los Workers de Cloudflare ya están registrados
            </div>
          ) : (
            <div className="space-y-2">
              {discovered.map((item: any) => (
                <div key={item.cloudflare_name} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{item.cloudflare_name}</p>
                    <p className="text-xs text-slate-400 capitalize">{item.resource_type.replace(/_/g, " ")} · {item.handlers?.join(", ") || "sin handlers"}</p>
                  </div>
                  <button
                    onClick={() => {
                      setForm({ ...form, cloudflare_name: item.cloudflare_name, resource_type: item.resource_type });
                      setShowDiscover(false);
                      setShowForm(true);
                    }}
                    className="btn-primary text-xs px-3 py-1.5 shrink-0"
                  >
                    Asignar a cliente
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
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
