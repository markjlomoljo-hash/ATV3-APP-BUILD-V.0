import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export interface SessionContext {
  userId: string;
  accessToken: string;
}

function serverSupabaseConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || key.startsWith("sb_secret_")) return null;
  return { url, key };
}

function bearerToken(req: NextRequest): string | null {
  const value = req.headers.get("authorization");
  if (!value?.startsWith("Bearer ")) return null;
  const token = value.slice(7).trim();
  return token || null;
}

async function verifySession(req: NextRequest): Promise<SessionContext | null> {
  const token = bearerToken(req);
  const config = serverSupabaseConfig();
  if (!token || !config) return null;

  const supabase = createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.id) return null;
  return { userId: data.user.id, accessToken: token };
}

/** Derive the protected actor only from a Supabase-verified bearer token. */
export function withSession<T = { params: Promise<Record<string, never>> }>(
  handler: (req: NextRequest, ctx: SessionContext, routeCtx: T) => Promise<NextResponse>,
) {
  return async (req: NextRequest, routeCtx: T): Promise<NextResponse> => {
    const session = await verifySession(req);
    if (!session) {
      return NextResponse.json({ ok: false, error: "auth_required" }, { status: 401 });
    }
    return handler(req, session, routeCtx);
  };
}
