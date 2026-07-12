import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, isDatabaseConfigurationError } from "@/db";
import { consentSettings } from "@/db/schema";
import { withSession } from "@/lib/session";
import { consentUpdateSchema } from "@/lib/validation";
import { recordProfileAuditEvent } from "@/lib/audit";

export const dynamic = "force-dynamic";

function databaseUnavailable(error: unknown) {
  if (isDatabaseConfigurationError(error)) {
    return NextResponse.json({ ok: false, error: "database_not_configured" }, { status: 503 });
  }
  return NextResponse.json({ ok: false, error: "database_unavailable" }, { status: 503 });
}

export const GET = withSession(async (_req, { userId }) => {
  try {
    const db = getDb();
    const [row] = await db.select().from(consentSettings).where(eq(consentSettings.userId, userId)).limit(1);
    return NextResponse.json({ ok: true, consent: row ?? null });
  } catch (error) {
    return databaseUnavailable(error);
  }
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

  try {
    const db = getDb();
    const [before] = await db.select().from(consentSettings).where(eq(consentSettings.userId, userId)).limit(1);

    const [updated] = await db
      .insert(consentSettings)
      .values({ userId, ...parsed.data, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: consentSettings.userId,
        set: { ...parsed.data, updatedAt: new Date() },
      })
      .returning();

    await recordProfileAuditEvent(userId, "consent_updated", { before, after: updated });

    return NextResponse.json({ ok: true, consent: updated });
  } catch (error) {
    return databaseUnavailable(error);
  }
});
