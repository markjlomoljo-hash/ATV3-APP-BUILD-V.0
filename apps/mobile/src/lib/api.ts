import { supabase } from "./supabase";

const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");

export async function apiFetch(path: string, init: RequestInit = {}) {
  if (!apiBase) throw new Error("api_not_configured");
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("auth_required");

  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${data.session.access_token}`,
      ...init.headers
    }
  });
  const payload = await response.json().catch(() => ({ ok: false, error: "non_json_response" }));
  if (!response.ok) throw new Error(payload.error ?? `http_${response.status}`);
  return payload;
}
