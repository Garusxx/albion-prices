const DEFAULT_BACKEND_URL = "http://localhost:4000";

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

function getBackendUrl() {
  const backendUrl = process.env.BACKEND_URL;

  if (!backendUrl && process.env.NODE_ENV === "production") {
    throw new Error("BACKEND_URL must be set for the frontend service.");
  }

  return backendUrl || DEFAULT_BACKEND_URL;
}

async function proxyRequest(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const sourceUrl = new URL(request.url);
  const targetUrl = new URL(`/api/${path.join("/")}`, getBackendUrl());

  targetUrl.search = sourceUrl.search;

  const headers = new Headers(request.headers);
  headers.delete("host");

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: ["GET", "HEAD"].includes(request.method)
      ? undefined
      : await request.arrayBuffer(),
    cache: "no-store",
  });

  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export async function GET(request: Request, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return proxyRequest(request, context);
}
