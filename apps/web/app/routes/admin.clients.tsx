import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Plus, Search } from "lucide-react";
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
        <h1 className="text-2xl font-bold">Clientes</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition text-sm"
        >
          <Plus className="w-4 h-4" /> Nuevo cliente
        </button>
      </div>

      {showForm && (
        <form onSubmit={createClient} className="bg-white rounded-xl border border-gray-200 p-6 mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email de facturación</label>
              <input type="email" value={form.billing_email} onChange={(e) => setForm({ ...form, billing_email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <select value={form.plan_type} onChange={(e) => setForm({ ...form, plan_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="usage_based">Por uso</option>
                <option value="fixed">Fijo</option>
                <option value="hybrid">Híbrido</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Markup (%)</label>
              <input type="number" value={form.markup_percentage} onChange={(e) => setForm({ ...form, markup_percentage: Number(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700">Crear</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200">Cancelar</button>
          </div>
        </form>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text" placeholder="Buscar clientes..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Nombre</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Plan</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Markup</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/admin/clients/${c.id}`} className="text-brand-600 font-medium hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.email}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">{c.plan_type}</span>
                  </td>
                  <td className="px-4 py-3 text-sm">{c.markup_percentage}%</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${c.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {c.is_active ? "Activo" : "Inactivo"}
                    </span>
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
