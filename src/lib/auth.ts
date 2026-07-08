import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { generateOpaqueToken, hashToken } from "@/lib/security/tokens";
import { unauthorized } from "@/lib/http";

export const SESSION_COOKIE_NAME = "atx_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type AuthUser = typeof users.$inferSelect;

export interface AuthContext {
  user: AuthUser;
  sessionId: string;
}

/** Creates a durable session row and returns the raw token to set as a cookie. */
export async function createSession(
  userId: string,
  meta: { userAgent?: string | null; ipAddress?: string | null },
) {
  const { token, tokenHash } = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const [session] = await db
    .insert(sessions)
    .values({
      userId,
      tokenHash,
      userAgent: meta.userAgent ?? null,
      ipAddress: meta.ipAddress ?? null,
      expiresAt,
    })
    .returning();

  return { token, session, expiresAt };
}

export function setSessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/** Revokes a session by its raw token (used on logout). */
export async function revokeSessionByToken(token: string) {
  const tokenHash = hashToken(token);
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt)));
}

/** Resolves the authenticated user for a request, or null if unauthenticated. */
export async function getAuthContext(req: NextRequest): Promise<AuthContext | null> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const now = new Date();

  const rows = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, now),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  if (row.user.accountStatus === "deleted" || row.user.accountStatus === "suspended") {
    return null;
  }

  // Best-effort touch of last-used timestamp; failures here should never block the request.
  void db
    .update(sessions)
    .set({ lastUsedAt: now })
    .where(eq(sessions.id, row.session.id))
    .catch(() => undefined);

  return { user: row.user, sessionId: row.session.id };
}

/** Use inside route handlers: returns the auth context or a 401 NextResponse. */
export async function requireAuth(
  req: NextRequest,
): Promise<{ ctx: AuthContext } | { error: NextResponse }> {
  const ctx = await getAuthContext(req);
  if (!ctx) return { error: unauthorized() };
  return { ctx };
}
