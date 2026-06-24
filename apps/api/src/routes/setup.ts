import { Hono } from "hono";
import type { Bindings } from "../types";
import { createDb } from "../db";
import { hashPassword } from "../utils/password";
import type { User } from "@dash/db";

const setup = new Hono<{ Bindings: Bindings }>();

setup.post("/", async (c) => {
  const db = createDb(c.env.DB);

  const existingAdmin = await db.qOne<User>("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (existingAdmin) {
    return c.json({ message: "El sistema ya está configurado", initialized: true });
  }

  const hash = await hashPassword("admin123");
  await db.qRun(
    "INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')",
    "admin", hash
  );

  const pricingExists = await db.qOne<{ cnt: number }>("SELECT COUNT(*) as cnt FROM pricing_tiers");
  if (!pricingExists || pricingExists.cnt === 0) {
    await db.qRun(
      `INSERT INTO pricing_tiers (plan_name, included_requests, included_cpu_ms, price_per_million_requests, price_per_million_cpu_ms, overage_markup_percent, is_default) VALUES
       ('starter', 5000000, 15000000, 0.30, 0.02, 0, 0),
       ('business', 20000000, 60000000, 0.25, 0.015, 0, 1),
       ('enterprise', 100000000, 300000000, 0.20, 0.01, 0, 0)`
    );
  }

  return c.json({ message: "Sistema inicializado correctamente", initialized: true });
});

setup.get("/status", async (c) => {
  const db = createDb(c.env.DB);
  const adminCount = await db.qOne<{ cnt: number }>("SELECT COUNT(*) as cnt FROM users WHERE role = 'admin'");
  const clientCount = await db.qOne<{ cnt: number }>("SELECT COUNT(*) as cnt FROM clients");
  const resourceCount = await db.qOne<{ cnt: number }>("SELECT COUNT(*) as cnt FROM resources");
  const pricingCount = await db.qOne<{ cnt: number }>("SELECT COUNT(*) as cnt FROM pricing_tiers");

  return c.json({
    initialized: (adminCount?.cnt ?? 0) > 0,
    stats: {
      admins: adminCount?.cnt ?? 0,
      clients: clientCount?.cnt ?? 0,
      resources: resourceCount?.cnt ?? 0,
      pricing_tiers: pricingCount?.cnt ?? 0,
    },
    env: {
      has_jwt_secret: !!c.env.JWT_SECRET,
      has_cf_token: !!c.env.CLOUDFLARE_API_TOKEN,
      has_account_tag: !!c.env.CLOUDFLARE_ACCOUNT_TAG,
    },
  });
});

export default setup;
