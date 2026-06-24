import { Hono } from "hono";
import type { Bindings } from "../types";
import { createDb, paginate } from "../db";
import { authMiddleware, adminOnly } from "../middleware/auth";
import type { Invoice, InvoiceItem, Client, UsageSnapshot, Resource } from "@dash/db";
import { startOfMonthForDate, endOfMonthUTC, todayUTC, daysBetween } from "../utils/date";

const invoices = new Hono<{ Bindings: Bindings }>();

invoices.use("*", authMiddleware);

invoices.get("/", async (c) => {
  const user = c.get("user");
  const page = parseInt(c.req.query("page") || "1", 10);
  const limit = Math.min(parseInt(c.req.query("limit") || "20", 10), 100);
  const clientId = c.req.query("client_id");
  const status = c.req.query("status");

  const db = createDb(c.env.DB);
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (user.role === "client") {
    conditions.push("i.client_id = ?");
    params.push(user.client_id);
  } else if (clientId) {
    conditions.push("i.client_id = ?");
    params.push(parseInt(clientId, 10));
  }

  if (status) {
    conditions.push("i.status = ?");
    params.push(status);
  }

  const result = await paginate<Invoice>(
    db, "invoices i", conditions, params, page, limit, "i.created_at DESC"
  );

  return c.json(result);
});

invoices.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const user = c.get("user");

  const db = createDb(c.env.DB);
  const invoice = await db.qOne<Invoice>("SELECT * FROM invoices WHERE id = ?", id);
  if (!invoice) {
    return c.json({ error: "Not Found", message: "Factura no encontrada" }, 404);
  }

  if (user.role === "client" && invoice.client_id !== user.client_id) {
    return c.json({ error: "Forbidden", message: "No tienes acceso a esta factura" }, 403);
  }

  const items = await db.q<InvoiceItem>(
    "SELECT * FROM invoice_items WHERE invoice_id = ?", id
  );

  const client = await db.qOne<Client>("SELECT * FROM clients WHERE id = ?", invoice.client_id);

  return c.json({ ...invoice, items, client });
});

invoices.post("/generate", adminOnly, async (c) => {
  const { client_id, period_start, period_end } = await c.req.json<{
    client_id: number;
    period_start: string;
    period_end?: string;
  }>();

  if (!client_id || !period_start) {
    return c.json({ error: "Bad Request", message: "client_id y period_start requeridos" }, 400);
  }

  const db = createDb(c.env.DB);
  const client = await db.qOne<Client>("SELECT * FROM clients WHERE id = ?", client_id);
  if (!client) {
    return c.json({ error: "Not Found", message: "Cliente no encontrado" }, 404);
  }

  const end = period_end || endOfMonthUTC();
  const start = period_start;

  const existingInvoice = await db.qOne<Invoice>(
    "SELECT id FROM invoices WHERE client_id = ? AND period_start = ? AND period_end = ?",
    client_id, start, end
  );
  if (existingInvoice) {
    return c.json({ error: "Conflict", message: "Ya existe una factura para este período" }, 409);
  }

  const usageData = await db.q<{
    resource_id: number;
    requests_count: number;
    cpu_time_ms: number;
    estimated_cost_cents: number;
  }>(
    `SELECT us.resource_id,
            COALESCE(SUM(us.requests_count), 0) as requests_count,
            COALESCE(SUM(us.cpu_time_ms), 0) as cpu_time_ms,
            COALESCE(SUM(us.estimated_cost_cents), 0) as estimated_cost_cents
     FROM usage_snapshots us
     JOIN resources r ON us.resource_id = r.id AND r.client_id = ?
     WHERE us.snapshot_date >= ? AND us.snapshot_date <= ?
     GROUP BY us.resource_id`,
    client_id, start, end
  );

  const totalUsageCents = usageData.reduce((sum, u) => sum + u.estimated_cost_cents, 0);
  const fixedFeeCents = ["fixed", "hybrid"].includes(client.plan_type) ? client.fixed_monthly_fee : 0;
  const usageFeeCents = ["usage_based", "hybrid"].includes(client.plan_type) ? totalUsageCents : 0;
  const totalCents = fixedFeeCents + usageFeeCents;

  const now = todayUTC();
  await db.qRun(
    `INSERT INTO invoices (client_id, period_start, period_end, fixed_fee_cents, usage_fee_cents, total_cents, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'draft', ?)`,
    client_id, start, end, fixedFeeCents, usageFeeCents, totalCents, now
  );

  const invoice = await db.qOne<Invoice>(
    "SELECT * FROM invoices WHERE client_id = ? AND period_start = ? AND period_end = ?",
    client_id, start, end
  );

  for (const item of usageData) {
    const resource = await db.qOne<Resource>("SELECT * FROM resources WHERE id = ?", item.resource_id);
    await db.qRun(
      `INSERT INTO invoice_items (invoice_id, resource_id, description, quantity, unit_price_cents, total_cents)
       VALUES (?, ?, ?, ?, ?, ?)`,
      invoice!.id,
      item.resource_id,
      resource?.display_name || resource?.cloudflare_name || `Resource #${item.resource_id}`,
      item.requests_count,
      item.estimated_cost_cents > 0 ? Math.round(item.estimated_cost_cents / item.requests_count) : 0,
      item.estimated_cost_cents
    );
  }

  if (fixedFeeCents > 0) {
    await db.qRun(
      `INSERT INTO invoice_items (invoice_id, resource_id, description, quantity, unit_price_cents, total_cents)
       VALUES (?, NULL, ?, 1, ?, ?)`,
      invoice!.id,
      `Mensualidad fija (${client.plan_type})`,
      fixedFeeCents,
      fixedFeeCents
    );
  }

  return c.json(invoice, 201);
});

export default invoices;
