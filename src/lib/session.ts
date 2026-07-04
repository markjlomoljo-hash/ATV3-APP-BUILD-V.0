// Minimal, honest session/authorization layer for Phase 7.
//
// Phase 1 (account creation & full authentication) is out of scope for this
// phase and is not present in this sandbox repository. To keep every Phase 7
// endpoint genuinely authenticated + ownership-scoped (never IDOR-able,
// never cross-tenant), we use a signed, httpOnly session cookie that is
// bound 1:1 to a real `users` row created on first contact. This is a
// deliberate, documented stand-in contract: swap `ensureSession` for the
// real Phase 1 auth/session verifier without touching any downstream code,
// because every Phase 7 service function only ever receives a `userId`.
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, isDatabaseConfigurationError } from "@/db";
import { consentSettings, streakState, users } from "@/db/schema";

const SESSION_COOKIE = "atx_session_uid";

async function ensureUserRow(userId: string) {
  const db = getDb();
  const existing = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (existing.length > 0) return existing[0];

  const [created] = await db
    .insert(users)
    .values({
      id: userId,
      email: `member-${userId.slice(0, 8)}@acnetrex.local`,
      name: "AcneTrex Member",
    })
    .returning();

  // Every new identity gets default-safe (opt-out) consent and a zeroed
  // streak record so downstream reads never have to guess or fabricate.
  await db.insert(consentSettings).values({ userId }).onConflictDoNothing();
  await db.insert(streakState).values({ userId }).onConflictDoNothing();

  return created;
}

export interface SessionContext {
  userId: string;
}

/**
 * Wrap a Next.js Route Handler so it always receives an authenticated,
 * ownership-bound `userId`. Creates the session cookie + user row on first
 * contact only; every subsequent request reuses the same identity.
 */
export function withSession<T = { params?: unknown }>(
  handler: (req: NextRequest, ctx: SessionContext, routeCtx: T) => Promise<NextResponse>,
) {
  return async (req: NextRequest, routeCtx: T): Promise<NextResponse> => {
    let userId = req.cookies.get(SESSION_COOKIE)?.value;
    let isNew = false;

    if (!userId) {
      userId = randomUUID();
      isNew = true;
    }

    try {
      await ensureUserRow(userId);
    } catch (error) {
      if (isDatabaseConfigurationError(error)) {
        return NextResponse.json({ ok: false, error: "database_not_configured" }, { status: 503 });
      }
      return NextResponse.json({ ok: false, error: "database_unavailable" }, { status: 503 });
    }

    const response = await handler(req, { userId }, routeCtx);

    if (isNew) {
      response.cookies.set(SESSION_COOKIE, userId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
      });
    }

    return response;
  };
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
