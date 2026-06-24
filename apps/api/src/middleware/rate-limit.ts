import type { Context, Next } from "hono";
import type { Bindings, JwtPayload } from "../types";

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_IP = 100;
const MAX_REQUESTS_PER_ADMIN = 1000;

export async function rateLimitMiddleware(c: Context<{ Bindings: Bindings }>, next: Next) {
  const ip = c.req.header("CF-Connecting-IP") || c.req.header("x-forwarded-for") || "unknown";
  const user = c.get("user") as JwtPayload | undefined;
  const isAdmin = user?.role === "admin";
  const maxReqs = isAdmin ? MAX_REQUESTS_PER_ADMIN : MAX_REQUESTS_PER_IP;
  const key = isAdmin ? `rl:admin:${user!.sub}` : `rl:ip:${ip}`;

  const now = Math.floor(Date.now() / WINDOW_MS);
  const windowKey = `${key}:${now}`;

  try {
    const current = await c.env.CACHE.get(windowKey);
    const count = current ? parseInt(current, 10) : 0;

    if (count >= maxReqs) {
      return c.json({
        error: "Rate Limit",
        message: `Límite de ${maxReqs} req/min excedido`,
      }, 429);
    }

    await c.env.CACHE.put(windowKey, String(count + 1), {
      expirationTtl: Math.ceil(WINDOW_MS / 1000),
    });

    c.header("X-RateLimit-Remaining", String(maxReqs - count - 1));
    c.header("X-RateLimit-Limit", String(maxReqs));
  } catch {
    // Si KV falla, permitir la solicitud
  }

  await next();
}
