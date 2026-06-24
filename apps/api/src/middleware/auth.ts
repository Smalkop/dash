import type { Context, Next } from "hono";
import { verifyToken } from "../utils/jwt";
import type { Bindings, JwtPayload } from "../types";

export async function authMiddleware(c: Context<{ Bindings: Bindings }>, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized", message: "Token requerido" }, 401);
  }

  const token = authHeader.slice(7);
  const payload = await verifyToken(token, c.env.JWT_SECRET);
  if (!payload) {
    return c.json({ error: "Unauthorized", message: "Token inválido o expirado" }, 401);
  }

  c.set("user", payload);
  await next();
}

export function adminOnly(c: Context<{ Bindings: Bindings }>, next: Next) {
  const user = c.get("user") as JwtPayload;
  if (user.role !== "admin") {
    return c.json({ error: "Forbidden", message: "Solo administradores" }, 403);
  }
  return next();
}

export function clientOnly(c: Context<{ Bindings: Bindings }>, next: Next) {
  const user = c.get("user") as JwtPayload;
  if (user.role !== "client") {
    return c.json({ error: "Forbidden", message: "Solo clientes" }, 403);
  }
  return next();
}
