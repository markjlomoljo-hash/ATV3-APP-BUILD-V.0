import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { withErrorHandling } from "@/lib/http";
import { evaluateReadiness } from "@/lib/services/aiReadiness";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const domains = await evaluateReadiness(auth.ctx.user.id);
    return NextResponse.json({ domains });
  });
}
