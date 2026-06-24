import { useState, useEffect } from "react";
import { apiGet, apiPost, type PaginatedResponse } from "../lib/api";
import { FileText, Plus } from "lucide-react";

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ client_id: "", period_start: "", period_end: "" });

  const loadData = async () => {
    setLoading(true);
    try {
      const [invRes, cliRes] = await Promise.all([
        apiGet<PaginatedResponse<any>>("/invoices"),
        apiGet<PaginatedResponse<any>>("/clients"),
      ]);
      setInvoices(invRes.data);
      setClients(cliRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const generateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiPost("/invoices/generate", {
        client_id: Number(form.client_id),
        period_start: form.period_start,
        period_end: form.period_end || undefined,
      });
      setShowForm(false);
      setForm({ client_id: "", period_start: "", period_end: "" });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    sent: "bg-blue-50 text-blue-700",
    paid: "bg-green-50 text-green-700",
    overdue: "bg-red-50 text-red-700",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Facturas</h1>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700">
          <Plus className="w-4 h-4" /> Generar factura
        </button>
      </div>

      {showForm && (
        <form onSubmit={generateInvoice} className="bg-white rounded-xl border border-gray-200 p-6 mb-6 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} required
                className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="">Seleccionar...</option>
                {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Inicio período</label>
              <input type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} required
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fin período</label>
              <input type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm">Generar</button>
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
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">#</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Cliente</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Período</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Total</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Estado</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv: any) => (
                <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">INV-{String(inv.id).padStart(6, "0")}</td>
                  <td className="px-4 py-3 text-sm">{clients.find((c: any) => c.id === inv.client_id)?.name || `#${inv.client_id}`}</td>
                  <td className="px-4 py-3 text-sm">{inv.period_start} al {inv.period_end}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">${(inv.total_cents / 100).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${statusColors[inv.status] || "bg-gray-100"}`}>{inv.status}</span>
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
