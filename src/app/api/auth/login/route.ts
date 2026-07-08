import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, loginAudits } from "@/db/schema";
import { loginSchema } from "@/lib/validation/auth";
import { verifyPassword } from "@/lib/security/password";
import { createSession, setSessionCookie } from "@/lib/auth";
import { checkRateLimit, clientIpFromRequest } from "@/lib/security/rateLimit";
import { errorResponse, parseJsonBody, withErrorHandling } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const ip = clientIpFromRequest(req);
    const userAgent = req.headers.get("user-agent");

    const parsed = await parseJsonBody(req, loginSchema);
    if ("error" in parsed) return parsed.error;
    const { email, password } = parsed.data;

    const limit = checkRateLimit(`login:${ip}:${email}`, { limit: 8, windowMs: 15 * 60 * 1000 });
    if (!limit.allowed) {
      await db.insert(loginAudits).values({ email, outcome: "rate_limited", ipAddress: ip, userAgent });
      return errorResponse(429, "rate_limited", "Too many login attempts. Try again later.");
    }

    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = rows[0];

    if (!user) {
      await db.insert(loginAudits).values({ email, outcome: "invalid_credentials", ipAddress: ip, userAgent });
      return errorResponse(401, "invalid_credentials", "Email or password is incorrect.");
    }

    if (user.accountStatus === "deleted" || user.accountStatus === "suspended") {
      await db
        .insert(loginAudits)
        .values({ userId: user.id, email, outcome: "account_locked", ipAddress: ip, userAgent });
      return errorResponse(403, "account_unavailable", "This account is not available.");
    }

    const validPassword = await verifyPassword(password, user.passwordHash);
    if (!validPassword) {
      await db
        .insert(loginAudits)
        .values({ userId: user.id, email, outcome: "invalid_credentials", ipAddress: ip, userAgent });
      return errorResponse(401, "invalid_credentials", "Email or password is incorrect.");
    }

    const { token, expiresAt } = await createSession(user.id, { userAgent, ipAddress: ip });
    await db.insert(loginAudits).values({ userId: user.id, email, outcome: "success", ipAddress: ip, userAgent });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        accountStatus: user.accountStatus,
      },
    });
    setSessionCookie(response, token, expiresAt);
    return response;
  });
}
