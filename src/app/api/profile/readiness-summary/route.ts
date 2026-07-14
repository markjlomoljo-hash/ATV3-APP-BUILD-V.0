import { NextResponse } from "next/server";
import { withSession } from "@/lib/session";
import { computeModelReadiness } from "@/lib/profile/readiness";

export const dynamic = "force-dynamic";

export const GET = withSession(async (_req, { userId }) => {
  const readiness = await computeModelReadiness(userId);
  return NextResponse.json({ ok: true, readiness });
});
