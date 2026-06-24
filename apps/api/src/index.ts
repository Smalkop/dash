import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { Bindings } from "./types";

import authRoutes from "./routes/auth";
import clientRoutes from "./routes/clients";
import resourceRoutes from "./routes/resources";
import metricRoutes from "./routes/metrics";
import invoiceRoutes from "./routes/invoices";
import alertRoutes from "./routes/alerts";
import setupRoutes from "./routes/setup";

import { errorMiddleware } from "./middleware/error";
import { runDailySync } from "./services/cron";

const app = new Hono<{ Bindings: Bindings }>();

// Global middleware
app.use("*", logger());
app.use("*", cors({
  origin: ["http://localhost:5173", "http://localhost:8788", "https://dash-api.smalkop.workers.dev"],
  credentials: true,
  allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));
app.use("*", errorMiddleware);

// Health check
app.get("/api/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

// Routes
app.route("/api/auth", authRoutes);
app.route("/api/clients", clientRoutes);
app.route("/api/resources", resourceRoutes);
app.route("/api/metrics", metricRoutes);
app.route("/api/invoices", invoiceRoutes);
app.route("/api/alerts", alertRoutes);
app.route("/api/setup", setupRoutes);

// Cron trigger handler
app.get("/api/cron/manual", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const { verifyToken } = await import("./utils/jwt");
  const payload = await verifyToken(authHeader.slice(7), c.env.JWT_SECRET);
  if (!payload || payload.role !== "admin") {
    return c.json({ error: "Forbidden" }, 403);
  }
  const result = await runDailySync(c.env);
  return c.json(result);
});

// Scheduled event handler
export default {
  async fetch(request: Request, env: Bindings, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const isStaticAsset = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot|webp|avif)$/i.test(url.pathname);

    // API routes go through Hono
    if (url.pathname.startsWith("/api/")) {
      return app.fetch(request, env, ctx);
    }

    // Static assets and SPA routes
    try {
      const response = await env.ASSETS.fetch(request);
      if (response.status === 404 && !isStaticAsset) {
        // SPA fallback: serve index.html for client-side routing
        return env.ASSETS.fetch(new Request(new URL("/index.html", url.origin), request));
      }
      return response;
    } catch {
      return new Response("Not Found", { status: 404 });
    }
  },
  async scheduled(controller: ScheduledController, env: Bindings, ctx: ExecutionContext): Promise<void> {
    console.log(`Cron triggered at ${new Date().toISOString()}`);
    ctx.waitUntil(runDailySync(env));
  },
};
