import type { Context, Next } from "hono";
import type { Bindings } from "../types";

export async function errorMiddleware(c: Context<{ Bindings: Bindings }>, next: Next) {
  try {
    await next();
  } catch (err) {
    console.error("Unhandled error:", err);
    return c.json({
      error: "Internal Server Error",
      message: err instanceof Error ? err.message : "Error inesperado",
    }, 500);
  }
}
