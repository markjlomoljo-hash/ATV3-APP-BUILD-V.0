import { NextRequest, NextResponse } from "next/server";
import { withSession } from "@/lib/session";
import { getProfessionalProfile } from "@/lib/profile/aggregate";

export const dynamic = "force-dynamic";

export const GET = withSession(async (_req: NextRequest, { userId }) => {
  const profile = await getProfessionalProfile(userId);
  return NextResponse.json({ ok: true, profile });
});
