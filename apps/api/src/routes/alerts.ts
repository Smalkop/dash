import { Hono } from "hono";
import type { Bindings } from "../types";
import { createDb, paginate } from "../db";
import { authMiddleware } from "../middleware/auth";
import type { AlertRule, Notification } from "@dash/db";

const alerts = new Hono<{ Bindings: Bindings }>();

alerts.use("*", authMiddleware);

alerts.get("/rules", async (c) => {
  const user = c.get("user");
  const page = parseInt(c.req.query("page") || "1", 10);
  const limit = Math.min(parseInt(c.req.query("limit") || "20", 10), 100);

  const db = createDb(c.env.DB);
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (user.role === "client") {
    conditions.push("(client_id = ? OR client_id IS NULL)");
    params.push(user.client_id);
  }

  const result = await paginate<AlertRule>(
    db, "alert_rules", conditions, params, page, limit, "created_at DESC"
  );

  return c.json(result);
});

alerts.post("/rules", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{
    client_id?: number;
    resource_id?: number;
    metric_type: "requests" | "cpu_time" | "cost";
    threshold_value: number;
    comparison: "gt" | "lt";
    notification_email?: string;
  }>();

  if (!body.metric_type || !body.threshold_value || !body.comparison) {
    return c.json({ error: "Bad Request", message: "metric_type, threshold_value y comparison requeridos" }, 400);
  }

  if (user.role === "client") {
    body.client_id = user.client_id!;
  }

  const db = createDb(c.env.DB);
  await db.qRun(
    `INSERT INTO alert_rules (client_id, resource_id, metric_type, threshold_value, comparison, notification_email)
     VALUES (?, ?, ?, ?, ?, ?)`,
    body.client_id || null,
    body.resource_id || null,
    body.metric_type,
    body.threshold_value,
    body.comparison,
    body.notification_email || null
  );

  return c.json({ message: "Regla de alerta creada" }, 201);
});

alerts.put("/rules/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const body = await c.req.json<Partial<AlertRule>>();

  const db = createDb(c.env.DB);
  const rule = await db.qOne<AlertRule>("SELECT * FROM alert_rules WHERE id = ?", id);
  if (!rule) {
    return c.json({ error: "Not Found", message: "Regla no encontrada" }, 404);
  }

  const user = c.get("user");
  if (user.role === "client" && rule.client_id !== user.client_id) {
    return c.json({ error: "Forbidden", message: "No tienes acceso a esta regla" }, 403);
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  const updatable = ["metric_type", "threshold_value", "comparison", "notification_email", "is_active"];

  for (const field of updatable) {
    if (body[field as keyof typeof body] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(body[field as keyof typeof body]);
    }
  }

  if (fields.length > 0) {
    values.push(id);
    await db.qRun(`UPDATE alert_rules SET ${fields.join(", ")} WHERE id = ?`, ...values);
  }

  return c.json({ message: "Regla actualizada" });
});

alerts.delete("/rules/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const db = createDb(c.env.DB);
  const rule = await db.qOne<AlertRule>("SELECT * FROM alert_rules WHERE id = ?", id);

  if (!rule) {
    return c.json({ error: "Not Found", message: "Regla no encontrada" }, 404);
  }

  const user = c.get("user");
  if (user.role === "client" && rule.client_id !== user.client_id) {
    return c.json({ error: "Forbidden", message: "No tienes acceso a esta regla" }, 403);
  }

  await db.qRun("DELETE FROM alert_rules WHERE id = ?", id);
  return c.json({ message: "Regla eliminada" });
});

alerts.get("/notifications", async (c) => {
  const user = c.get("user");
  const db = createDb(c.env.DB);
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (user.role === "client") {
    conditions.push("client_id = ?");
    params.push(user.client_id);
  }

  const notifications = await db.q<Notification>(
    `SELECT * FROM notifications ${conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : ""} ORDER BY created_at DESC LIMIT 50`,
    ...params
  );

  return c.json(notifications);
});

alerts.post("/notifications/:id/read", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const db = createDb(c.env.DB);
  await db.qRun("UPDATE notifications SET is_read = 1 WHERE id = ?", id);
  return c.json({ message: "Notificación marcada como leída" });
});

export default alerts;
