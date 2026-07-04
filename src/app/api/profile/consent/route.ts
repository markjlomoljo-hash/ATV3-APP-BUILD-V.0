import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { consentSettings } from "@/db/schema";
import { withSession } from "@/lib/session";
import { consentUpdateSchema } from "@/lib/validation";
import { recordProfileAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

export const GET = withSession(async (_req, { userId }) => {
  const db = getDb();
  const [row] = await db.select().from(consentSettings).where(eq(consentSettings.userId, userId)).limit(1);
  return NextResponse.json({ ok: true, consent: row ?? null });
});

export const PATCH = withSession(async (req, { userId }) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = consentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const db = getDb();
  const [before] = await db.select().from(consentSettings).where(eq(consentSettings.userId, userId)).limit(1);

  const [updated] = await db
    .update(consentSettings)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(consentSettings.userId, userId))
    .returning();

  await recordProfileAuditEvent(userId, "consent_updated", { before, after: parsed.data });

  return NextResponse.json({ ok: true, consent: updated });
});
