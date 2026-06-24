import type { JwtPayload } from "./types";

export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  EXPORTS: R2Bucket;
  JWT_SECRET: string;
  CLOUDFLARE_API_TOKEN: string;
  CLOUDFLARE_ACCOUNT_TAG: string;
  ENVIRONMENT: string;
}

export interface Variables {
  user: JwtPayload;
}
