const API_URL = "https://dash-api.smalkop.workers.dev";
const HTML = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Dash - Plataforma de Re-Facturación Cloudflare</title>
</head>
<body>
<h1>Dash Platform</h1>
<p>Cargando...</p>
</body>
</html>`;

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      const apiUrl = `${API_URL}${url.pathname}${url.search}`;
      const headers = new Headers(request.headers);
      headers.delete("host");
      return fetch(apiUrl, {
        method: request.method,
        headers,
        body: ["GET", "HEAD"].includes(request.method) ? null : request.body,
      });
    }

    return new Response(HTML, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  },
};
