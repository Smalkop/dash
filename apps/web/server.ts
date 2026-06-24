import { createRequestHandler } from "@react-router/cloudflare";
import type { ServerBuild } from "@react-router/cloudflare";

declare global {
  interface Env {
    API_URL: string;
    ENVIRONMENT: string;
  }
}

let handler: ReturnType<typeof createRequestHandler> | null = null;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (!handler) {
      const build = (await import("./build/server")) as unknown as ServerBuild;
      handler = createRequestHandler(build, env.ENVIRONMENT);
    }
    return handler(request, env, ctx);
  },
};
