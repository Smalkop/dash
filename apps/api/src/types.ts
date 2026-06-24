import type { Env, Variables } from "./env";

export type Bindings = Env & { Variables: Variables };

export interface PaginationParams {
  page?: number;
  limit?: number;
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

export interface ApiError {
  error: string;
  message: string;
  status: number;
}

export interface JwtPayload {
  sub: number;
  role: "admin" | "client";
  client_id: number | null;
  username: string;
  iat?: number;
  exp?: number;
}
