import { Hono } from "hono";
import type { Bindings } from "../types";
import { createDb, paginate } from "../db";
import { authMiddleware, adminOnly } from "../middleware/auth";
import type { Resource } from "@dash/db";

const resources = new Hono<{ Bindings: Bindings }>();

resources.use("*", authMiddleware);

resources.get("/", async (c) => {
  const user = c.get("user");
  const page = parseInt(c.req.query("page") || "1", 10);
  const limit = Math.min(parseInt(c.req.query("limit") || "50", 10), 100);
  const clientId = c.req.query("client_id");
  const type = c.req.query("type");

  const db = createDb(c.env.DB);
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (user.role === "client") {
    conditions.push("r.client_id = ?");
    params.push(user.client_id);
  } else if (clientId) {
    conditions.push("r.client_id = ?");
    params.push(parseInt(clientId, 10));
  }

  if (type) {
    conditions.push("r.resource_type = ?");
    params.push(type);
  }

  const result = await paginate<Resource>(
    db,
    "resources r",
    conditions,
    params,
    page,
    limit,
    "r.created_at DESC"
  );

  return c.json(result);
});

resources.get("/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const user = c.get("user");

  const db = createDb(c.env.DB);
  const resource = await db.qOne<Resource>("SELECT * FROM resources WHERE id = ?", id);
  if (!resource) {
    return c.json({ error: "Not Found", message: "Recurso no encontrado" }, 404);
  }

  if (user.role === "client" && resource.client_id !== user.client_id) {
    return c.json({ error: "Forbidden", message: "No tienes acceso a este recurso" }, 403);
  }

  return c.json(resource);
});

resources.get("/discover", adminOnly, async (c) => {
  const db = createDb(c.env.DB);

  try {
    const { listWorkerScripts, resourceTypeFromHandlers } = await import("../services/cloudflare-api");

    const scripts = await listWorkerScripts(
      c.env.CLOUDFLARE_API_TOKEN,
      c.env.CLOUDFLARE_ACCOUNT_TAG
    );

    const existing = await db.q<{ cloudflare_name: string }>(
      "SELECT cloudflare_name FROM resources"
    );
    const existingNames = new Set(existing.map((r) => r.cloudflare_name));

    const newResources = scripts
      .filter((s) => !existingNames.has(s.id))
      .map((s) => ({
        cloudflare_name: s.id,
        resource_type: resourceTypeFromHandlers(s.handlers),
        handlers: s.handlers,
        usage_model: s.usage_model,
        created_on: s.created_on,
        modified_on: s.modified_on,
      }));

    const totalWorkers = scripts.length;
    const registeredCount = existing.length;
    const unregisteredCount = newResources.length;

    return c.json({
      total_workers: totalWorkers,
      registered: registeredCount,
      unregistered: unregisteredCount,
      new_resources: newResources,
    });
  } catch (err) {
    console.error("Discovery error:", err);
    return c.json({
      error: "Internal Server Error",
      message: err instanceof Error ? err.message : "Error al descubrir recursos",
    }, 500);
  }
});

resources.post("/", adminOnly, async (c) => {
  const body = await c.req.json<{
    client_id: number;
    resource_type: string;
    cloudflare_name: string;
    cloudflare_id?: string;
    display_name?: string;
  }>();

  if (!body.client_id || !body.resource_type || !body.cloudflare_name) {
    return c.json({ error: "Bad Request", message: "client_id, resource_type y cloudflare_name requeridos" }, 400);
  }

  const validTypes = ["worker_script", "d1_database", "kv_namespace", "r2_bucket", "durable_object", "workflow"];
  if (!validTypes.includes(body.resource_type)) {
    return c.json({ error: "Bad Request", message: `Tipo inválido. Válidos: ${validTypes.join(", ")}` }, 400);
  }

  const db = createDb(c.env.DB);
  const client = await db.qOne("SELECT id FROM clients WHERE id = ?", body.client_id);
  if (!client) {
    return c.json({ error: "Not Found", message: "Cliente no encontrado" }, 404);
  }

  await db.qRun(
    `INSERT INTO resources (client_id, resource_type, cloudflare_name, cloudflare_id, display_name)
     VALUES (?, ?, ?, ?, ?)`,
    body.client_id,
    body.resource_type,
    body.cloudflare_name,
    body.cloudflare_id || null,
    body.display_name || null
  );

  const newResource = await db.qOne<Resource>(
    "SELECT * FROM resources WHERE cloudflare_name = ? AND client_id = ?",
    body.cloudflare_name, body.client_id
  );

  return c.json(newResource, 201);
});

resources.put("/:id", adminOnly, async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const body = await c.req.json<Partial<Resource>>();

  const db = createDb(c.env.DB);
  const resource = await db.qOne<Resource>("SELECT * FROM resources WHERE id = ?", id);
  if (!resource) {
    return c.json({ error: "Not Found", message: "Recurso no encontrado" }, 404);
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  const updatable = ["client_id", "resource_type", "cloudflare_name", "cloudflare_id", "display_name", "is_active"];

  for (const field of updatable) {
    if (body[field as keyof typeof body] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(body[field as keyof typeof body]);
    }
  }

  if (fields.length > 0) {
    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);
    await db.qRun(`UPDATE resources SET ${fields.join(", ")} WHERE id = ?`, ...values);
  }

  const updated = await db.qOne<Resource>("SELECT * FROM resources WHERE id = ?", id);
  return c.json(updated);
});

resources.delete("/:id", adminOnly, async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const db = createDb(c.env.DB);
  const resource = await db.qOne<Resource>("SELECT * FROM resources WHERE id = ?", id);
  if (!resource) {
    return c.json({ error: "Not Found", message: "Recurso no encontrado" }, 404);
  }

  await db.qRun("DELETE FROM usage_snapshots WHERE resource_id = ?", id);
  await db.qRun("DELETE FROM resources WHERE id = ?", id);
  return c.json({ message: "Recurso eliminado" });
});

export default resources;
