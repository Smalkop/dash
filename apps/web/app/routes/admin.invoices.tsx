import { useState, useEffect } from "react";
import { apiGet, apiPost, type PaginatedResponse } from "../lib/api";
import { Plus, FileText } from "lucide-react";

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

  const statusStyles: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700",
    sent: "bg-blue-50 text-blue-700",
    paid: "bg-emerald-50 text-emerald-700",
    overdue: "bg-red-50 text-red-700",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Facturas</h1>
          <p className="text-sm text-slate-500 mt-0.5">{invoices.length} facturas generadas</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus className="w-4 h-4" /> Generar factura
        </button>
      </div>

      {showForm && (
        <form onSubmit={generateInvoice} className="card p-6 mb-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Generar nueva factura</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
              <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className="input" required>
                <option value="">Seleccionar...</option>
                {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Inicio período</label>
              <input type="date" value={form.period_start} onChange={(e) => setForm({ ...form, period_start: e.target.value })} className="input" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fin período</label>
              <input type="date" value={form.period_end} onChange={(e) => setForm({ ...form, period_end: e.target.value })} className="input" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn-primary">Generar</button>
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
                <th className="table-header">#</th>
                <th className="table-header">Cliente</th>
                <th className="table-header">Período</th>
                <th className="table-header text-right">Total</th>
                <th className="table-header">Estado</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv: any) => (
                <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="table-cell font-mono text-xs">INV-{String(inv.id).padStart(6, "0")}</td>
                  <td className="table-cell text-slate-500">{clients.find((c: any) => c.id === inv.client_id)?.name || `#${inv.client_id}`}</td>
                  <td className="table-cell text-slate-500 text-xs">{inv.period_start} — {inv.period_end}</td>
                  <td className="table-cell text-right font-semibold">${(inv.total_cents / 100).toFixed(2)}</td>
                  <td className="table-cell">
                    <span className={`badge ${statusStyles[inv.status] || "bg-slate-100"}`}>{inv.status}</span>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400 text-sm">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No hay facturas generadas
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
