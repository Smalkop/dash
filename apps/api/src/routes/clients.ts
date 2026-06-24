import { Hono } from "hono";
import type { Bindings } from "../types";
import { createDb, paginate } from "../db";
import { authMiddleware, adminOnly } from "../middleware/auth";
import type { Client, UsageSnapshot } from "@dash/db";
import { startOfMonthUTC, todayUTC } from "../utils/date";

const clients = new Hono<{ Bindings: Bindings }>();

clients.use("*", authMiddleware);

clients.get("/", async (c) => {
  const user = c.get("user");
  const page = parseInt(c.req.query("page") || "1", 10);
  const limit = Math.min(parseInt(c.req.query("limit") || "20", 10), 100);

  const db = createDb(c.env.DB);

  if (user.role === "client") {
    const client = await db.qOne<Client>("SELECT * FROM clients WHERE id = ?", user.client_id);
    return c.json({ data: client ? [client] : [], meta: { page: 1, limit: 20, total: client ? 1 : 0, totalPages: 1 } });
  }

  const result = await paginate<Client>(
    db, "clients", [], [], page, limit, "name ASC"
  );

  return c.json(result);
});

clients.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const user = c.get("user");

  if (user.role === "client" && user.client_id !== id) {
    return c.json({ error: "Forbidden", message: "No tienes acceso a este cliente" }, 403);
  }

  const db = createDb(c.env.DB);
  const client = await db.qOne<Client>("SELECT * FROM clients WHERE id = ?", id);
  if (!client) {
    return c.json({ error: "Not Found", message: "Cliente no encontrado" }, 404);
  }

  const usage = await db.q<UsageSnapshot>(
    `SELECT COALESCE(SUM(requests_count), 0) as total_requests,
            COALESCE(SUM(cpu_time_ms), 0) as total_cpu_ms,
            COALESCE(SUM(wall_time_ms), 0) as total_wall_ms,
            COALESCE(SUM(estimated_cost_cents), 0) as total_cost_cents
     FROM usage_snapshots us
     JOIN resources r ON us.resource_id = r.id
     WHERE r.client_id = ? AND us.snapshot_date >= ? AND us.snapshot_date <= ?`,
    id, startOfMonthUTC(), todayUTC()
  );

  return c.json({
    ...client,
    current_month_usage: usage[0] || {
      total_requests: 0,
      total_cpu_ms: 0,
      total_wall_ms: 0,
      total_cost_cents: 0,
    },
  });
});

clients.post("/", adminOnly, async (c) => {
  const body = await c.req.json<{
    name: string;
    email: string;
    billing_email?: string;
    plan_type?: string;
    fixed_monthly_fee?: number;
    markup_percentage?: number;
  }>();

  if (!body.name || !body.email) {
    return c.json({ error: "Bad Request", message: "name y email requeridos" }, 400);
  }

  const db = createDb(c.env.DB);
  const existing = await db.qOne<Client>("SELECT id FROM clients WHERE email = ?", body.email);
  if (existing) {
    return c.json({ error: "Conflict", message: "Email ya registrado" }, 409);
  }

  await db.qRun(
    `INSERT INTO clients (name, email, billing_email, plan_type, fixed_monthly_fee, markup_percentage)
     VALUES (?, ?, ?, ?, ?, ?)`,
    body.name,
    body.email,
    body.billing_email || null,
    body.plan_type || "usage_based",
    body.fixed_monthly_fee || 0,
    body.markup_percentage ?? 30.0
  );

  const newClient = await db.qOne<Client>("SELECT * FROM clients WHERE email = ?", body.email);
  return c.json(newClient, 201);
});

clients.put("/:id", adminOnly, async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const body = await c.req.json<Partial<Client>>();

  const db = createDb(c.env.DB);
  const client = await db.qOne<Client>("SELECT * FROM clients WHERE id = ?", id);
  if (!client) {
    return c.json({ error: "Not Found", message: "Cliente no encontrado" }, 404);
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  const updatable = ["name", "email", "billing_email", "plan_type", "fixed_monthly_fee", "markup_percentage", "is_active"];
  for (const field of updatable) {
    if (body[field as keyof typeof body] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(body[field as keyof typeof body]);
    }
  }

  if (fields.length > 0) {
    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);
    await db.qRun(`UPDATE clients SET ${fields.join(", ")} WHERE id = ?`, ...values);
  }

  const updated = await db.qOne<Client>("SELECT * FROM clients WHERE id = ?", id);
  return c.json(updated);
});

export default clients;
