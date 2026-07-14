import { NextRequest, NextResponse } from "next/server";
import { withSession } from "@/lib/session";
import { sectionUpdateSchema } from "@/lib/validation";
import { PROFILE_SECTION_KEYS, ProfileSectionKey } from "@/types/profile";
import { updateProfileSection } from "@/lib/profile/update";

export const dynamic = "force-dynamic";

function isValidSectionKey(key: string): key is ProfileSectionKey {
  return (PROFILE_SECTION_KEYS as readonly string[]).includes(key);
}

export const PATCH = withSession<{ params: Promise<{ sectionKey: string }> }>(
  async (req, { userId }, routeCtx) => {
    const { sectionKey } = await routeCtx.params;

    if (!isValidSectionKey(sectionKey)) {
      return NextResponse.json({ ok: false, error: "Unknown profile section" }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = sectionUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid payload", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const updated = await updateProfileSection(userId, sectionKey, parsed.data.value, {
      reason: parsed.data.reason,
      includeInReports: parsed.data.includeInReports,
    });

    return NextResponse.json({ ok: true, section: updated });
  },
);
