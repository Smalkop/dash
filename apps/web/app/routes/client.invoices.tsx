import { useState, useEffect } from "react";
import { apiGet, type PaginatedResponse } from "../lib/api";
import { FileText, Download } from "lucide-react";

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

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    sent: "bg-blue-50 text-blue-700",
    paid: "bg-green-50 text-green-700",
    overdue: "bg-red-50 text-red-700",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Mis Facturas</h1>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No tienes facturas todavía</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Factura</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Período</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Cargo fijo</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Por uso</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Total</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Estado</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv: any) => (
                <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">INV-{String(inv.id).padStart(6, "0")}</td>
                  <td className="px-4 py-3 text-sm">{inv.period_start} al {inv.period_end}</td>
                  <td className="px-4 py-3 text-sm">${(inv.fixed_fee_cents / 100).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm">${(inv.usage_fee_cents / 100).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold">${(inv.total_cents / 100).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${statusColors[inv.status] || "bg-gray-100"}`}>
                      {inv.status}
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
