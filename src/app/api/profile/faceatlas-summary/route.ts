import { NextResponse } from "next/server";
import { withSession } from "@/lib/session";
import { computeFaceAtlasSummary } from "@/lib/profile/faceatlas";

export const dynamic = "force-dynamic";

export const GET = withSession(async (_req, { userId }) => {
  const summary = await computeFaceAtlasSummary(userId);
  return NextResponse.json({ ok: true, summary });
});
