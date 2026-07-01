import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { consents } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { parseJsonBody, withErrorHandling } from "@/lib/http";
import { revokeConsentSchema } from "@/lib/validation/consent";
import { writeAuditLog } from "@/lib/audit";
import { clientIpFromRequest } from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";

/**
 * Revokes a consent type by writing a new "revoked" record (append-only
 * history — prior grant rows are never mutated).
 */
export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;

    const parsed = await parseJsonBody(req, revokeConsentSchema);
    if ("error" in parsed) return parsed.error;
    const { consentType } = parsed.data;

    const [latest] = await db
      .select()
      .from(consents)
      .where(and(eq(consents.userId, userId), eq(consents.consentType, consentType)))
      .orderBy(desc(consents.createdAt))
      .limit(1);

    const now = new Date();
    const [row] = await db
      .insert(consents)
      .values({
        userId,
        consentType,
        status: "revoked",
        version: latest?.version ?? "unknown",
        revokedAt: now,
      })
      .returning();

    await writeAuditLog({
      userId,
      action: "consent.revoked",
      resourceType: "consent",
      resourceId: row.id,
      ipAddress: clientIpFromRequest(req),
      metadata: {
        consentType,
        note:
          consentType === "raw_image_model_improvement" || consentType === "anonymous_network_learning"
            ? "Future model-improvement/network-learning contributions are stopped as of now."
            : undefined,
      },
    });

    return NextResponse.json({ consent: row }, { status: 201 });
  });
}
