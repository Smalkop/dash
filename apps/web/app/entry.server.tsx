import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { ServerRouter } from "react-router";
import type { EntryContext } from "react-router";

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext
) {
  const html = renderToString(
    <StrictMode>
      <ServerRouter context={routerContext} url={request.url} />
    </StrictMode>
  );

  responseHeaders.set("Content-Type", "text/html; charset=utf-8");
  responseHeaders.set("X-Powered-By", "Dash Platform");

  return new Response("<!DOCTYPE html>" + html, {
    status: responseStatusCode,
    headers: responseHeaders,
  });
}
