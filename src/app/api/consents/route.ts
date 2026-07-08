import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { consents } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { parseJsonBody, withErrorHandling } from "@/lib/http";
import { grantConsentSchema } from "@/lib/validation/consent";
import { writeAuditLog } from "@/lib/audit";
import { clientIpFromRequest } from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";

/** Returns the full consent history (grants + revocations) for the caller. */
export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const rows = await db
      .select()
      .from(consents)
      .where(eq(consents.userId, auth.ctx.user.id))
      .orderBy(desc(consents.createdAt));

    // Also compute the current status per consent type for convenience.
    const latestByType = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      if (!latestByType.has(row.consentType)) latestByType.set(row.consentType, row);
    }

    return NextResponse.json({
      consents: rows,
      current: Object.fromEntries(latestByType.entries()),
    });
  });
}

/** Records a new consent grant. Consents are append-only for full auditability. */
export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;

    const parsed = await parseJsonBody(req, grantConsentSchema);
    if ("error" in parsed) return parsed.error;
    const { consentType, version, sourceScreen, metadata } = parsed.data;

    const [row] = await db
      .insert(consents)
      .values({
        userId,
        consentType,
        status: "granted",
        version,
        sourceScreen,
        grantedAt: new Date(),
        metadata: metadata ?? null,
      })
      .returning();

    await writeAuditLog({
      userId,
      action: "consent.granted",
      resourceType: "consent",
      resourceId: row.id,
      ipAddress: clientIpFromRequest(req),
      metadata: { consentType, version },
    });

    return NextResponse.json({ consent: row }, { status: 201 });
  });
}
