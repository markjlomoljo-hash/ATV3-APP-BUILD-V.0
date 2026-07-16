const ALLOWED_METHODS = "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS";
const ALLOWED_HEADERS = "Authorization,Content-Type,X-Request-Id,X-CSRF-Token";

function normalizedOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function isCorsOriginAllowed(
  origin: string | null,
  configuredOrigins = process.env.API_CORS_ALLOWED_ORIGINS ?? "",
): boolean {
  if (!origin) return false;
  const normalized = normalizedOrigin(origin);
  if (!normalized) return false;
  const allowed = configuredOrigins
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value && value !== "*")
    .map(normalizedOrigin)
    .filter((value): value is string => Boolean(value));
  return allowed.includes(normalized);
}

export function corsHeadersForOrigin(
  origin: string | null,
  configuredOrigins = process.env.API_CORS_ALLOWED_ORIGINS ?? "",
): Record<string, string> | null {
  if (!isCorsOriginAllowed(origin, configuredOrigins) || !origin) return null;
  return {
    "Access-Control-Allow-Origin": new URL(origin).origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

export function appendCorsHeaders(response: Response, headers: Record<string, string> | null) {
  if (!headers) return response;
  for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
  return response;
}
