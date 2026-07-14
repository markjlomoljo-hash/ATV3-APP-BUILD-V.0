import { NextResponse } from "next/server";
import { withSession } from "@/lib/session";
import { PROFILE_SECTION_KEYS, ProfileSectionKey } from "@/types/profile";
import { getSectionHistory } from "@/lib/profile/update";

export const dynamic = "force-dynamic";

function isValidSectionKey(key: string): key is ProfileSectionKey {
  return (PROFILE_SECTION_KEYS as readonly string[]).includes(key);
}

export const GET = withSession<{ params: Promise<{ sectionKey: string }> }>(
  async (_req, { userId }, routeCtx) => {
    const { sectionKey } = await routeCtx.params;
    if (!isValidSectionKey(sectionKey)) {
      return NextResponse.json({ ok: false, error: "Unknown profile section" }, { status: 404 });
    }
    const history = await getSectionHistory(userId, sectionKey);
    return NextResponse.json({ ok: true, history });
  },
);
