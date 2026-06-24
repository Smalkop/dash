import { Hono } from "hono";
import type { Bindings } from "../types";
import { createDb } from "../db";
import { authMiddleware, adminOnly } from "../middleware/auth";
import type { UsageSnapshot, Resource } from "@dash/db";

const metrics = new Hono<{ Bindings: Bindings }>();

metrics.use("*", authMiddleware);

metrics.get("/summary", async (c) => {
  const user = c.get("user");
  const clientId = c.req.query("client_id") ? parseInt(c.req.query("client_id")!, 10) : user.client_id;
  const start = c.req.query("start") || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]!;
  const end = c.req.query("end") || new Date().toISOString().split("T")[0]!;

  if (user.role === "client" && clientId !== user.client_id) {
    return c.json({ error: "Forbidden", message: "No tienes acceso a estos datos" }, 403);
  }

  const db = createDb(c.env.DB);

  const summary = await db.q<{
    total_requests: number;
    total_cpu_ms: number;
    total_wall_ms: number;
    total_cost_cents: number;
  }>(
    `SELECT COALESCE(SUM(us.requests_count), 0) as total_requests,
            COALESCE(SUM(us.cpu_time_ms), 0) as total_cpu_ms,
            COALESCE(SUM(us.wall_time_ms), 0) as total_wall_ms,
            COALESCE(SUM(us.estimated_cost_cents), 0) as total_cost_cents
     FROM usage_snapshots us
     JOIN resources r ON us.resource_id = r.id
     WHERE r.client_id = ? AND us.snapshot_date >= ? AND us.snapshot_date <= ?`,
    clientId, start, end
  );

  const daily = await db.q<{
    snapshot_date: string;
    requests_count: number;
    cpu_time_ms: number;
    cost_cents: number;
  }>(
    `SELECT us.snapshot_date,
            COALESCE(SUM(us.requests_count), 0) as requests_count,
            COALESCE(SUM(us.cpu_time_ms), 0) as cpu_time_ms,
            COALESCE(SUM(us.estimated_cost_cents), 0) as cost_cents
     FROM usage_snapshots us
     JOIN resources r ON us.resource_id = r.id
     WHERE r.client_id = ? AND us.snapshot_date >= ? AND us.snapshot_date <= ?
     GROUP BY us.snapshot_date
     ORDER BY us.snapshot_date ASC`,
    clientId, start, end
  );

  return c.json({
    summary: summary[0] || { total_requests: 0, total_cpu_ms: 0, total_wall_ms: 0, total_cost_cents: 0 },
    daily,
    period: { start, end },
  });
});

metrics.get("/by-resource", async (c) => {
  const user = c.get("user");
  const clientId = c.req.query("client_id") ? parseInt(c.req.query("client_id")!, 10) : user.client_id;
  const start = c.req.query("start") || new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]!;
  const end = c.req.query("end") || new Date().toISOString().split("T")[0]!;

  if (user.role === "client" && clientId !== user.client_id) {
    return c.json({ error: "Forbidden", message: "No tienes acceso a estos datos" }, 403);
  }

  const db = createDb(c.env.DB);

  const resources = await db.q<Resource>(
    "SELECT * FROM resources WHERE client_id = ? AND is_active = 1",
    clientId
  );

  const resourceUsage = await db.q<{
    resource_id: number;
    requests_count: number;
    cpu_time_ms: number;
    wall_time_ms: number;
    estimated_cost_cents: number;
  }>(
    `SELECT us.resource_id,
            COALESCE(SUM(us.requests_count), 0) as requests_count,
            COALESCE(SUM(us.cpu_time_ms), 0) as cpu_time_ms,
            COALESCE(SUM(us.wall_time_ms), 0) as wall_time_ms,
            COALESCE(SUM(us.estimated_cost_cents), 0) as estimated_cost_cents
     FROM usage_snapshots us
     WHERE us.resource_id IN (SELECT id FROM resources WHERE client_id = ? AND is_active = 1)
       AND us.snapshot_date >= ? AND us.snapshot_date <= ?
     GROUP BY us.resource_id`,
    clientId, start, end
  );

  const result = resources.map((r) => {
    const usage = resourceUsage.find((u) => u.resource_id === r.id) || {
      resource_id: r.id,
      requests_count: 0,
      cpu_time_ms: 0,
      wall_time_ms: 0,
      estimated_cost_cents: 0,
    };
    return { ...r, usage };
  });

  return c.json(result);
});

metrics.post("/sync", adminOnly, async (c) => {
  const { syncMetricsFromGraphQL } = await import("../services/cloudflare-graphql");
  const { calculateCosts } = await import("../services/cost-calculator");
  const { evaluateAlerts } = await import("../services/cloudflare-graphql");

  const db = createDb(c.env.DB);
  const date = c.req.query("date") || new Date(Date.now() - 86400000).toISOString().split("T")[0]!;

  const resources = await db.q<Resource>(
    "SELECT * FROM resources WHERE is_active = 1 AND resource_type = 'worker_script'"
  );

  let synced = 0;
  let errors = 0;

  for (const resource of resources) {
    try {
      const metrics = await syncMetricsFromGraphQL(
        c.env.CLOUDFLARE_API_TOKEN,
        c.env.CLOUDFLARE_ACCOUNT_TAG,
        resource.cloudflare_name,
        date,
        date
      );

      const cost = await calculateCosts(db, resource.client_id, metrics.requests, metrics.cpuTimeMs);

      await db.qRun(
        `INSERT INTO usage_snapshots (resource_id, snapshot_date, requests_count, cpu_time_ms, wall_time_ms, estimated_cost_cents)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(resource_id, snapshot_date) DO UPDATE SET
           requests_count = excluded.requests_count,
           cpu_time_ms = excluded.cpu_time_ms,
           wall_time_ms = excluded.wall_time_ms,
           estimated_cost_cents = excluded.estimated_cost_cents`,
        resource.id,
        date,
        metrics.requests,
        metrics.cpuTimeMs,
        metrics.wallTimeMs,
        cost.totalCents
      );

      synced++;
    } catch (err) {
      console.error(`Error syncing ${resource.cloudflare_name}:`, err);
      errors++;
    }
  }

  await evaluateAlerts(db, date);

  return c.json({ message: "Sincronización completada", synced, errors, date });
});

export default metrics;
