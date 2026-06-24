import type { Resource } from "@dash/db";
import { yesterdayUTC } from "../utils/date";
import type { Env } from "../env";

export async function runDailySync(env: Env): Promise<{
  message: string;
  synced: number;
  errors: number;
  date: string;
}> {
  const date = yesterdayUTC();
  const db = {
    q: async <T>(sql: string, ...params: unknown[]): Promise<T[]> => {
      const stmt = env.DB.prepare(sql).bind(...params);
      const { results } = await stmt.all();
      return results as unknown as T[];
    },
    qOne: async <T>(sql: string, ...params: unknown[]): Promise<T | null> => {
      const stmt = env.DB.prepare(sql).bind(...params);
      return (await stmt.first()) as unknown as T | null;
    },
    qRun: async (sql: string, ...params: unknown[]) => {
      const stmt = env.DB.prepare(sql).bind(...params);
      return stmt.run();
    },
  };

  const resources = await db.q<Resource>(
    "SELECT * FROM resources WHERE is_active = 1 AND resource_type = 'worker_script'"
  );

  let synced = 0;
  let errors = 0;

  const { syncMetricsFromGraphQL, evaluateAlerts } = await import("./cloudflare-graphql");
  const { calculateCosts } = await import("./cost-calculator");

  for (const resource of resources) {
    try {
      const metrics = await syncMetricsFromGraphQL(
        env.CLOUDFLARE_API_TOKEN,
        env.CLOUDFLARE_ACCOUNT_TAG,
        resource.cloudflare_name,
        date,
        date
      );

      const cost = await calculateCosts(
        db,
        resource.client_id,
        metrics.requests,
        metrics.cpuTimeMs
      );

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

  return { message: "Sincronización diaria completada", synced, errors, date };
}
