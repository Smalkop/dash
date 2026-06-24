import { Hono } from "hono";
import { compareSync, hashSync } from "bcryptjs";
import type { Bindings } from "../types";
import { createDb } from "../db";
import { signToken, verifyToken } from "../utils/jwt";
import type { User } from "@dash/db";

const auth = new Hono<{ Bindings: Bindings }>();

auth.post("/login", async (c) => {
  const { username, password } = await c.req.json<{ username: string; password: string }>();
  if (!username || !password) {
    return c.json({ error: "Bad Request", message: "username y password requeridos" }, 400);
  }

  const db = createDb(c.env.DB);
  const user = await db.qOne<User>(
    "SELECT * FROM users WHERE username = ?",
    username
  );

  if (!user || !compareSync(password, user.password_hash)) {
    return c.json({ error: "Unauthorized", message: "Credenciales inválidas" }, 401);
  }

  const token = await signToken(
    { sub: user.id, role: user.role, client_id: user.client_id, username: user.username },
    c.env.JWT_SECRET
  );

  return c.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      client_id: user.client_id,
    },
  });
});

auth.post("/verify", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ valid: false }, 401);
  }

  const payload = await verifyToken(authHeader.slice(7), c.env.JWT_SECRET);
  if (!payload) {
    return c.json({ valid: false }, 401);
  }

  return c.json({ valid: true, user: payload });
});

auth.post("/register-client", async (c) => {
  const { username, password, client_id } = await c.req.json<{
    username: string;
    password: string;
    client_id: number;
  }>();

  if (!username || !password || !client_id) {
    return c.json({ error: "Bad Request", message: "username, password y client_id requeridos" }, 400);
  }

  const db = createDb(c.env.DB);
  const existing = await db.qOne<User>("SELECT id FROM users WHERE username = ?", username);
  if (existing) {
    return c.json({ error: "Conflict", message: "El usuario ya existe" }, 409);
  }

  const hash = hashSync(password, 10);
  await db.qRun(
    "INSERT INTO users (username, password_hash, role, client_id) VALUES (?, ?, 'client', ?)",
    username,
    hash,
    client_id
  );

  return c.json({ message: "Usuario cliente creado" }, 201);
});

export default auth;
