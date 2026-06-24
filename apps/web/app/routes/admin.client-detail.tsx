import { useState, useEffect } from "react";
import { useParams } from "react-router";
import { apiGet, apiPut, apiPost } from "../lib/api";
import { KpiCard } from "../components/kpi-card";
import { Activity, Cpu, DollarSign, FileText } from "lucide-react";

export default function AdminClientDetailPage() {
  const { id } = useParams();
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "" });

  const loadClient = async () => {
    try {
      const res = await apiGet<any>(`/clients/${id}`);
      setClient(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadClient(); }, [id]);

  const updateClient = async () => {
    try {
      await apiPut(`/clients/${id}`, client);
      setEditMode(false);
    } catch (err) {
      console.error(err);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiPost("/auth/register-client", { ...newUser, client_id: Number(id) });
      setNewUser({ username: "", password: "" });
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><div className="loading-spinner" /></div>;
  if (!client) return <div className="text-center py-16 text-red-400">Cliente no encontrado</div>;

  const usg = client.current_month_usage || {};

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{client.name}</h1>
          <p className="text-sm text-slate-500 mt-0.5">Detalle del cliente</p>
        </div>
        <button onClick={() => setEditMode(!editMode)} className="btn-secondary">
          {editMode ? "Cancelar" : "Editar cliente"}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard title="Requests del mes" value={(usg.total_requests ?? 0).toLocaleString()} icon={<Activity className="w-4 h-4" />} />
        <KpiCard title="CPU Time" value={`${((usg.total_cpu_ms ?? 0) / 1000).toFixed(1)}s`} icon={<Cpu className="w-4 h-4" />} />
        <KpiCard title="Costo estimado" value={`$${((usg.total_cost_cents ?? 0) / 100).toFixed(2)}`} icon={<DollarSign className="w-4 h-4" />} />
        <KpiCard title="Plan" value={client.plan_type.replace("_", " ")} icon={<FileText className="w-4 h-4" />} />
      </div>

      <div className="card p-6 mb-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Información del cliente</h3>
        {editMode ? (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {["name", "email", "billing_email", "plan_type", "fixed_monthly_fee", "markup_percentage"].map((f) => (
                <div key={f}>
                  <label className="block text-sm font-medium text-slate-700 mb-1 capitalize">{f.replace(/_/g, " ")}</label>
                  <input type={f.includes("fee") || f.includes("percentage") ? "number" : "text"}
                    value={(client as any)[f] ?? ""}
                    onChange={(e) => setClient({ ...client, [f]: e.target.value })}
                    className="input" />
                </div>
              ))}
            </div>
            <button onClick={updateClient} className="btn-primary">Guardar cambios</button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div><span className="text-slate-500">Email</span><p className="font-medium text-slate-900">{client.email}</p></div>
            <div><span className="text-slate-500">Facturación</span><p className="font-medium text-slate-900">{client.billing_email || "—"}</p></div>
            <div><span className="text-slate-500">Markup</span><p className="font-medium text-slate-900">{client.markup_percentage}%</p></div>
            <div><span className="text-slate-500">Tarifa fija</span><p className="font-medium text-slate-900">${(client.fixed_monthly_fee / 100).toFixed(2)}</p></div>
            <div><span className="text-slate-500">Plan</span><p className="font-medium text-slate-900 capitalize">{client.plan_type.replace(/_/g, " ")}</p></div>
            <div><span className="text-slate-500">Estado</span><p className="font-medium text-slate-900">{client.is_active ? "Activo" : "Inactivo"}</p></div>
          </div>
        )}
      </div>

      <div className="card p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Crear usuario de acceso</h3>
        <form onSubmit={createUser} className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
            <input type="text" value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} className="input" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
            <input type="password" value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="input" required />
          </div>
          <button type="submit" className="btn-primary">Crear usuario</button>
        </form>
      </div>
    </div>
  );
}
