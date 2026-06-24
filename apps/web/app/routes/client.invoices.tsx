import { useState, useEffect } from "react";
import { apiGet, type PaginatedResponse } from "../lib/api";
import { FileText } from "lucide-react";

export default function ClientInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiGet<PaginatedResponse<any>>("/invoices");
        setInvoices(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const statusStyles: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700",
    sent: "bg-blue-50 text-blue-700",
    paid: "bg-emerald-50 text-emerald-700",
    overdue: "bg-red-50 text-red-700",
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-6">Mis Facturas</h1>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="loading-spinner" /></div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No tienes facturas todavía</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="table-header">Factura</th>
                <th className="table-header">Período</th>
                <th className="table-header text-right">Cargo fijo</th>
                <th className="table-header text-right">Por uso</th>
                <th className="table-header text-right">Total</th>
                <th className="table-header">Estado</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv: any) => (
                <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="table-cell font-mono text-xs">INV-{String(inv.id).padStart(6, "0")}</td>
                  <td className="table-cell text-slate-500 text-xs">{inv.period_start} — {inv.period_end}</td>
                  <td className="table-cell text-right text-slate-500">${(inv.fixed_fee_cents / 100).toFixed(2)}</td>
                  <td className="table-cell text-right text-slate-500">${(inv.usage_fee_cents / 100).toFixed(2)}</td>
                  <td className="table-cell text-right font-semibold">${(inv.total_cents / 100).toFixed(2)}</td>
                  <td className="table-cell">
                    <span className={`badge ${statusStyles[inv.status] || "bg-slate-100"}`}>{inv.status}</span>
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
