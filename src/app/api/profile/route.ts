import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles, profileHistory } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { parseJsonBody, withErrorHandling } from "@/lib/http";
import { profileUpdateSchema, CLINICAL_FIELDS } from "@/lib/validation/profile";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, auth.ctx.user.id)).limit(1);
    return NextResponse.json({ profile: profile ?? null });
  });
}

export async function PUT(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;

    const parsed = await parseJsonBody(req, profileUpdateSchema);
    if ("error" in parsed) return parsed.error;
    const updates = parsed.data;

    const [existing] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);

    const normalized = {
      ...updates,
      dateOfBirth: updates.dateOfBirth ? new Date(updates.dateOfBirth) : undefined,
    };

    const [profile] = await db
      .insert(profiles)
      .values({ userId, ...normalized })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: { ...normalized, updatedAt: new Date() },
      })
      .returning();

    // Versioned history for clinically important fields.
    if (existing) {
      const historyRows = CLINICAL_FIELDS.filter((field) => field in updates)
        .filter((field) => JSON.stringify(existing[field]) !== JSON.stringify((updates as Record<string, unknown>)[field]))
        .map((field) => ({
          userId,
          fieldName: field,
          previousValue: existing[field] as unknown,
          newValue: (updates as Record<string, unknown>)[field],
          source: "settings",
        }));
      if (historyRows.length > 0) {
        await db.insert(profileHistory).values(historyRows);
      }
    }

    await writeAuditLog({ userId, action: "profile.updated", resourceType: "profile", resourceId: userId });

    return NextResponse.json({ profile });
  });
}
