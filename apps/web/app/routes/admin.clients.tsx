import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Plus, Search, Users } from "lucide-react";
import { apiGet, apiPost, type PaginatedResponse } from "../lib/api";
import type { Client } from "@dash/db";

export default function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", billing_email: "", plan_type: "usage_based", markup_percentage: 30 });

  const loadClients = async () => {
    setLoading(true);
    try {
      const res = await apiGet<PaginatedResponse<Client>>("/clients");
      setClients(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadClients(); }, []);

  const createClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiPost("/clients", form);
      setShowForm(false);
      setForm({ name: "", email: "", billing_email: "", plan_type: "usage_based", markup_percentage: 30 });
      loadClients();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-500 mt-0.5">{clients.length} clientes registrados</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus className="w-4 h-4" /> Nuevo cliente
        </button>
      </div>

      {showForm && (
        <form onSubmit={createClient} className="card p-6 mb-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Nuevo cliente</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email de facturación</label>
              <input type="email" value={form.billing_email} onChange={(e) => setForm({ ...form, billing_email: e.target.value })}
                className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Plan</label>
              <select value={form.plan_type} onChange={(e) => setForm({ ...form, plan_type: e.target.value })} className="input">
                <option value="usage_based">Por uso</option>
                <option value="fixed">Fijo</option>
                <option value="hybrid">Híbrido</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Markup (%)</label>
              <input type="number" value={form.markup_percentage} onChange={(e) => setForm({ ...form, markup_percentage: Number(e.target.value) })}
                className="input" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary">Crear</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
          </div>
        </form>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" placeholder="Buscar clientes..." value={search}
          onChange={(e) => setSearch(e.target.value)} className="input pl-10" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="loading-spinner" /></div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="table-header">Nombre</th>
                <th className="table-header">Email</th>
                <th className="table-header">Plan</th>
                <th className="table-header">Markup</th>
                <th className="table-header">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="table-cell">
                    <Link to={`/admin/clients/${c.id}`} className="text-indigo-600 font-medium hover:text-indigo-700">
                      {c.name}
                    </Link>
                  </td>
                  <td className="table-cell text-slate-500">{c.email}</td>
                  <td className="table-cell">
                    <span className="badge bg-indigo-50 text-indigo-700">{c.plan_type.replace("_", " ")}</span>
                  </td>
                  <td className="table-cell text-slate-500">{c.markup_percentage}%</td>
                  <td className="table-cell">
                    <span className={`badge ${c.is_active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                      {c.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400 text-sm">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No se encontraron clientes
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
