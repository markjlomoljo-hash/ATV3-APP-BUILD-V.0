import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, clearSessionCookie, revokeSessionByToken } from "@/lib/auth";
import { withErrorHandling } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      await revokeSessionByToken(token);
    }
    const response = NextResponse.json({ ok: true });
    clearSessionCookie(response);
    return response;
  });
}
