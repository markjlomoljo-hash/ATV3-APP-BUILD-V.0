export type SupabaseRequestAuth =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 503; error: "auth_required" | "invalid_access_token" | "auth_not_configured" | "auth_unavailable" };

type Fetcher = typeof fetch;

function configuredSupabaseAuth(): { url: string; publicKey: string } | null {
  const url =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL;
  const publicKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY;

  // Supabase secret keys are never valid browser/request-verification keys.
  // Do not fall back to SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY.
  if (!url || !publicKey || publicKey.startsWith("sb_secret_")) return null;
  return { url, publicKey };
}

export async function authenticateSupabaseRequest(
  request: Request,
  fetcher: Fetcher = fetch,
): Promise<SupabaseRequestAuth> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ") || authorization.length <= 7) {
    return { ok: false, status: 401, error: "auth_required" };
  }

  const config = configuredSupabaseAuth();
  if (!config) {
    return { ok: false, status: 503, error: "auth_not_configured" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3_000);
  try {
    const response = await fetcher(`${config.url.replace(/\/+$/, "")}/auth/v1/user`, {
      headers: { apikey: config.publicKey, authorization },
      signal: controller.signal,
    });
    if (!response.ok) {
      if (response.status >= 500 || response.status === 408 || response.status === 429) {
        return { ok: false, status: 503, error: "auth_unavailable" };
      }
      return { ok: false, status: 401, error: "invalid_access_token" };
    }
    const payload: unknown = await response.json().catch(() => null);
    const userId =
      typeof payload === "object" && payload !== null && "id" in payload && typeof payload.id === "string"
        ? payload.id
        : null;
    return userId
      ? { ok: true, userId }
      : { ok: false, status: 401, error: "invalid_access_token" };
  } catch {
    return { ok: false, status: 503, error: "auth_unavailable" };
  } finally {
    clearTimeout(timeout);
  }
}
