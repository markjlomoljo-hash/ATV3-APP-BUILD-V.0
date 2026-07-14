import { NextResponse } from "next/server";
import { withSession } from "@/lib/session";
import { computeTreatmentSummary } from "@/lib/profile/treatment";

export const dynamic = "force-dynamic";

export const GET = withSession(async (_req, { userId }) => {
  const summary = await computeTreatmentSummary(userId);
  return NextResponse.json({ ok: true, summary });
});
