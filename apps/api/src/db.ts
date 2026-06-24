import type { D1Database } from "@cloudflare/workers-types/2023-07-01";
import type {
  Client,
  Resource,
  UsageSnapshot,
  PricingTier,
  Invoice,
  InvoiceItem,
  AlertRule,
  Notification,
  User,
} from "@dash/db";

type Row = Record<string, unknown>;

function mapRow<T>(row: Row | null): T | null {
  if (!row) return null;
  return row as unknown as T;
}

function mapRows<T>(rows: Row[]): T[] {
  return rows as unknown as T[];
}

export function createDb(db: D1Database) {
  const q = async <T>(sql: string, ...params: unknown[]): Promise<T[]> => {
    const stmt = db.prepare(sql).bind(...params);
    const { results } = await stmt.all<Row>();
    return mapRows<T>(results);
  };

  const qOne = async <T>(sql: string, ...params: unknown[]): Promise<T | null> => {
    const stmt = db.prepare(sql).bind(...params);
    const row = await stmt.first<Row>();
    return mapRow<T>(row);
  };

  const qRun = async (sql: string, ...params: unknown[]) => {
    const stmt = db.prepare(sql).bind(...params);
    return stmt.run();
  };

  return { q, qOne, qRun };
}

export type DbClient = ReturnType<typeof createDb>;

export async function paginate<T>(
  db: DbClient,
  table: string,
  conditions: string[],
  params: unknown[],
  page: number,
  limit: number,
  orderBy = "id DESC"
): Promise<{ data: T[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (page - 1) * limit;

  const countResult = await db.qOne<{ total: number }>(
    `SELECT COUNT(*) as total FROM ${table} ${where}`,
    ...params
  );
  const total = countResult?.total ?? 0;

  const data = await db.q<T>(
    `SELECT * FROM ${table} ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    ...params,
    limit,
    offset
  );

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
