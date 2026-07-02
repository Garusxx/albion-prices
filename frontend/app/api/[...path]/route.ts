const DEFAULT_BACKEND_URL = "http://localhost:4000";

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

function getBackendUrl() {
  const backendUrl = process.env.BACKEND_URL;

  return (
    backendUrl ||
    (process.env.NODE_ENV === "production" ? null : DEFAULT_BACKEND_URL)
  );
}

async function proxyRequest(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const sourceUrl = new URL(request.url);
  const backendUrl = getBackendUrl();

  if (!backendUrl) {
    return Response.json(
      {
        error: "BACKEND_URL is not configured for the frontend service.",
      },
      { status: 500 },
    );
  }

  const targetUrl = new URL(`/api/${path.join("/")}`, backendUrl);

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
