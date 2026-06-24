import type { Client, Invoice, InvoiceItem } from "@dash/db";

interface InvoiceData {
  invoice: Invoice;
  client: Client;
  items: InvoiceItem[];
}

export async function generateInvoicePdf(
  data: InvoiceData
): Promise<Uint8Array> {
  const { invoice, client, items } = data;

  const lines: string[] = [];
  lines.push("=".repeat(60));
  lines.push("FACTURA DASH - PLATAFORMA DE RE-FACTURACIÓN CLOUDFLARE");
  lines.push("=".repeat(60));
  lines.push("");
  lines.push(`Factura #: INV-${String(invoice.id).padStart(6, "0")}`);
  lines.push(`Cliente: ${client.name}`);
  lines.push(`Email: ${client.email}`);
  lines.push(`Período: ${invoice.period_start} al ${invoice.period_end}`);
  lines.push(`Estado: ${invoice.status.toUpperCase()}`);
  lines.push("");
  lines.push("-".repeat(60));
  lines.push("DETALLE DE CARGOS");
  lines.push("-".repeat(60));

  for (const item of items) {
    const qty = item.quantity.toLocaleString();
    const unitPrice = (item.unit_price_cents / 100).toFixed(2);
    const total = (item.total_cents / 100).toFixed(2);
    lines.push(`${item.description}`);
    lines.push(`  Cantidad: ${qty}  |  Precio unit.: $${unitPrice}  |  Total: $${total}`);
    lines.push("");
  }

  lines.push("-".repeat(60));
  lines.push(`Cargo fijo: $${(invoice.fixed_fee_cents / 100).toFixed(2)}`);
  lines.push(`Cargo por uso: $${(invoice.usage_fee_cents / 100).toFixed(2)}`);
  lines.push(`TOTAL: $${(invoice.total_cents / 100).toFixed(2)}`);
  lines.push("-".repeat(60));
  lines.push("");
  lines.push("Términos: Pago a 30 días");
  lines.push("Generado el: ${new Date().toISOString().split('T')[0]}");
  lines.push("");
  lines.push("Dash Platform - https://dash.tudominio.com");

  return new TextEncoder().encode(lines.join("\n"));
}
