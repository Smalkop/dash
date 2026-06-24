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
    total_imputed_cost_cents: number;
    total_free_exceeded: number;
  }>(
    `SELECT COALESCE(SUM(us.requests_count), 0) as total_requests,
            COALESCE(SUM(us.cpu_time_ms), 0) as total_cpu_ms,
            COALESCE(SUM(us.wall_time_ms), 0) as total_wall_ms,
            COALESCE(SUM(us.estimated_cost_cents), 0) as total_cost_cents,
            COALESCE(SUM(us.imputed_cost_cents), 0) as total_imputed_cost_cents,
            COALESCE(MAX(us.free_tier_exceeded), 0) as total_free_exceeded
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
    imputed_cost_cents: number;
    free_tier_usage_percent: number;
    free_tier_exceeded: number;
  }>(
    `SELECT us.snapshot_date,
            COALESCE(SUM(us.requests_count), 0) as requests_count,
            COALESCE(SUM(us.cpu_time_ms), 0) as cpu_time_ms,
            COALESCE(SUM(us.estimated_cost_cents), 0) as cost_cents,
            COALESCE(SUM(us.imputed_cost_cents), 0) as imputed_cost_cents,
            COALESCE(MAX(us.free_tier_usage_percent), 0) as free_tier_usage_percent,
            COALESCE(MAX(us.free_tier_exceeded), 0) as free_tier_exceeded
     FROM usage_snapshots us
     JOIN resources r ON us.resource_id = r.id
     WHERE r.client_id = ? AND us.snapshot_date >= ? AND us.snapshot_date <= ?
     GROUP BY us.snapshot_date
     ORDER BY us.snapshot_date ASC`,
    clientId, start, end
  );

  return c.json({
    summary: summary[0] || {
      total_requests: 0, total_cpu_ms: 0, total_wall_ms: 0,
      total_cost_cents: 0, total_imputed_cost_cents: 0, total_free_exceeded: 0,
    },
    daily,
    period: { start, end },
  });
});

metrics.get("/free-tier", async (c) => {
  const user = c.get("user");
  const clientId = c.req.query("client_id") ? parseInt(c.req.query("client_id")!, 10) : user.client_id;

  if (user.role === "client" && clientId !== user.client_id) {
    return c.json({ error: "Forbidden", message: "No tienes acceso a estos datos" }, 403);
  }

  const db = createDb(c.env.DB);
  const today = new Date().toISOString().split("T")[0]!;

  const todayUsage = await db.q<{
    total_requests: number;
    total_cpu_ms: number;
    imputed_cost_cents: number;
  }>(
    `SELECT COALESCE(SUM(us.requests_count), 0) as total_requests,
            COALESCE(SUM(us.cpu_time_ms), 0) as total_cpu_ms,
            COALESCE(SUM(us.imputed_cost_cents), 0) as imputed_cost_cents
     FROM usage_snapshots us
     JOIN resources r ON us.resource_id = r.id
     WHERE r.client_id = ? AND us.snapshot_date = ?`,
    clientId, today
  );

  const s = todayUsage[0] || { total_requests: 0, total_cpu_ms: 0, imputed_cost_cents: 0 };

  const FREE_DAILY_LIMIT = 100_000;
  const FREE_CPU_BUDGET = FREE_DAILY_LIMIT * 10;

  const requestsUsed = s.total_requests;
  const cpuMsUsed = s.total_cpu_ms;
  const requestsRemaining = Math.max(0, FREE_DAILY_LIMIT - requestsUsed);
  const cpuBudgetForUsed = Math.min(requestsUsed, FREE_DAILY_LIMIT) * 10;
  const cpuMsRemaining = Math.max(0, cpuBudgetForUsed - cpuMsUsed);
  const usagePercent = Math.min(100, Math.round(
    Math.max(
      (requestsUsed / FREE_DAILY_LIMIT) * 100,
      cpuMsUsed > 0 ? (cpuMsUsed / Math.max(1, cpuBudgetForUsed)) * 100 : 0
    )
  ));
  const exceeded = requestsUsed > FREE_DAILY_LIMIT || cpuMsUsed > cpuBudgetForUsed;

  return c.json({
    date: today,
    freeTier: {
      requestsLimit: FREE_DAILY_LIMIT,
      cpuMsLimit: FREE_CPU_BUDGET,
      requestsUsed,
      cpuMsUsed,
      requestsRemaining,
      cpuMsRemaining,
      usagePercent,
      exceeded,
      imputedCostCents: s.imputed_cost_cents,
    },
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
    imputed_cost_cents: number;
  }>(
    `SELECT us.resource_id,
            COALESCE(SUM(us.requests_count), 0) as requests_count,
            COALESCE(SUM(us.cpu_time_ms), 0) as cpu_time_ms,
            COALESCE(SUM(us.wall_time_ms), 0) as wall_time_ms,
            COALESCE(SUM(us.estimated_cost_cents), 0) as estimated_cost_cents,
            COALESCE(SUM(us.imputed_cost_cents), 0) as imputed_cost_cents
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
      imputed_cost_cents: 0,
    };
    return { ...r, usage };
  });

  return c.json(result);
});

metrics.post("/sync", adminOnly, async (c) => {
  const { discoverAndSyncResources } = await import("../services/cron");
  const result = await discoverAndSyncResources(c.env);
  return c.json(result);
});

export default metrics;
