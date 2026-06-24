const API_BASE = "/api";

function getToken(): string | null {
  if (typeof document === "undefined") return null;
  return localStorage.getItem("dash_token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Error de red" }));
    throw new Error(error.message || `Error ${res.status}`);
  }

  return res.json();
}

export function apiGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const query = params ? "?" + new URLSearchParams(params).toString() : "";
  return request<T>(`${path}${query}`);
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "PUT",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" });
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function login(username: string, password: string) {
  return apiPost<{ token: string; user: { id: number; username: string; role: string; client_id: number | null } }>(
    "/auth/login", { username, password }
  );
}

export function verifyToken() {
  return apiPost<{ valid: boolean; user?: { sub: number; role: string; client_id: number | null } }>("/auth/verify");
}
