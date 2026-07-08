import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, authIdentities, onboardingProgress, streaks } from "@/db/schema";
import { registerSchema } from "@/lib/validation/auth";
import { hashPassword } from "@/lib/security/password";
import { createSession, setSessionCookie } from "@/lib/auth";
import { checkRateLimit, clientIpFromRequest } from "@/lib/security/rateLimit";
import { writeAuditLog } from "@/lib/audit";
import { errorResponse, parseJsonBody, withErrorHandling } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const ip = clientIpFromRequest(req);
    const limit = checkRateLimit(`register:${ip}`, { limit: 10, windowMs: 60 * 60 * 1000 });
    if (!limit.allowed) {
      return errorResponse(429, "rate_limited", "Too many registration attempts. Try again later.");
    }

    const parsed = await parseJsonBody(req, registerSchema);
    if ("error" in parsed) return parsed.error;
    const { email, password, displayName } = parsed.data;

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return errorResponse(409, "email_in_use", "An account with this email already exists.");
    }

    const passwordHash = await hashPassword(password);
    const [user] = await db
      .insert(users)
      .values({ email, passwordHash, displayName: displayName ?? null })
      .returning();

    await db.insert(authIdentities).values({ userId: user.id, provider: "password" });
    await db.insert(onboardingProgress).values({ userId: user.id });
    await db.insert(streaks).values({ userId: user.id });

    const { token, expiresAt } = await createSession(user.id, {
      userAgent: req.headers.get("user-agent"),
      ipAddress: ip,
    });

    await writeAuditLog({
      userId: user.id,
      action: "account.registered",
      resourceType: "user",
      resourceId: user.id,
      ipAddress: ip,
    });

    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          accountStatus: user.accountStatus,
        },
      },
      { status: 201 },
    );
    setSessionCookie(response, token, expiresAt);
    return response;
  });
}
