import type { Config } from "@react-router/dev/config";

export default {
  appDirectory: "app",
  serverModuleFormat: "esm",
  serverPlatform: "neutral",
  serverEntry: "server.ts",
  server: {
    singleFetch: true,
  },
} satisfies Config;
