const API_URL = "https://dash-api.smalkop.workers.dev";

export async function onRequest(context: EventContext<Env, string, unknown>): Promise<Response> {
  const url = new URL(context.request.url);
  const apiUrl = `${API_URL}${url.pathname}${url.search}`;

  const headers = new Headers(context.request.headers);
  headers.delete("host");

  return fetch(apiUrl, {
    method: context.request.method,
    headers,
    body: ["GET", "HEAD"].includes(context.request.method) ? null : context.request.body,
  });
}
