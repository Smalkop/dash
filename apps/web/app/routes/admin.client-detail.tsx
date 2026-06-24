import { useState, useEffect } from "react";
import { useParams } from "react-router";
import { apiGet, apiPut, apiPost } from "../lib/api";
import { KpiCard } from "../components/kpi-card";
import type { Client } from "@dash/db";

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

  if (loading) return <div className="text-center py-12 text-gray-400">Cargando...</div>;
  if (!client) return <div className="text-center py-12 text-red-400">Cliente no encontrado</div>;

  const usg = client.current_month_usage || {};

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{client.name}</h1>
        <button onClick={() => setEditMode(!editMode)}
          className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">
          {editMode ? "Cancelar" : "Editar"}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <KpiCard title="Requests del mes" value={(usg.total_requests ?? 0).toLocaleString()} color="brand" />
        <KpiCard title="CPU Time (ms)" value={(usg.total_cpu_ms ?? 0).toLocaleString()} color="green" />
        <KpiCard title="Costo estimado" value={`$${((usg.total_cost_cents ?? 0) / 100).toFixed(2)}`} color="amber" />
        <KpiCard title="Plan" value={client.plan_type} color="brand" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        {editMode ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {["name", "email", "billing_email", "plan_type", "fixed_monthly_fee", "markup_percentage"].map((f) => (
                <div key={f}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f}</label>
                  <input
                    type={f.includes("fee") || f.includes("percentage") ? "number" : "text"}
                    value={(client as any)[f] ?? ""}
                    onChange={(e) => setClient({ ...client, [f]: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              ))}
            </div>
            <button onClick={updateClient} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm">Guardar</button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><span className="text-gray-500">Email:</span> <span className="font-medium">{client.email}</span></div>
            <div><span className="text-gray-500">Facturación:</span> <span className="font-medium">{client.billing_email || "—"}</span></div>
            <div><span className="text-gray-500">Markup:</span> <span className="font-medium">{client.markup_percentage}%</span></div>
            <div><span className="text-gray-500">Tarifa fija:</span> <span className="font-medium">${(client.fixed_monthly_fee / 100).toFixed(2)}</span></div>
            <div><span className="text-gray-500">Plan:</span> <span className="font-medium">{client.plan_type}</span></div>
            <div><span className="text-gray-500">Estado:</span> <span className="font-medium">{client.is_active ? "Activo" : "Inactivo"}</span></div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold mb-4">Crear usuario de acceso</h3>
        <form onSubmit={createUser} className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
            <input type="text" value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input type="password" value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm" required />
          </div>
          <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm">Crear usuario</button>
        </form>
      </div>
    </div>
  );
}
