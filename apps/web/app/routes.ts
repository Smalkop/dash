import type { RouteConfig } from "@react-router/dev/routes";
import { route, layout, index, prefix } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("login", "routes/login.tsx"),

  layout("components/admin-layout.tsx", [
    route("admin/clients", "routes/admin.clients.tsx"),
    route("admin/clients/:id", "routes/admin.client-detail.tsx"),
    route("admin/resources", "routes/admin.resources.tsx"),
    route("admin/metrics", "routes/admin.metrics.tsx"),
    route("admin/invoices", "routes/admin.invoices.tsx"),
  ]),

  layout("components/client-layout.tsx", [
    route("client/dashboard", "routes/client.dashboard.tsx"),
    route("client/invoices", "routes/client.invoices.tsx"),
    route("client/alerts", "routes/client.alerts.tsx"),
  ]),
] satisfies RouteConfig;
