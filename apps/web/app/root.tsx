import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import type { LinksFunction, MetaFunction } from "react-router";

import "./styles/app.css";

export const links: LinksFunction = () => [];
export const meta: MetaFunction = () => [
  { title: "Dash - Plataforma de Re-Facturación Cloudflare" },
  { name: "description", content: "Monitoreo y facturación de consumo Cloudflare" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
