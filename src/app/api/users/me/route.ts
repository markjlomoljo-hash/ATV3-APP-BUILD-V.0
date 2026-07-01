import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { clientIpFromRequest } from "@/lib/security/rateLimit";
import { errorResponse, withErrorHandling } from "@/lib/http";
import { z } from "zod";
import { parseJsonBody } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { user } = auth.ctx;

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        accountStatus: user.accountStatus,
        emailVerifiedAt: user.emailVerifiedAt,
        createdAt: user.createdAt,
      },
    });
  });
}

const updateMeSchema = z.object({
  displayName: z.string().trim().min(1).max(120).optional(),
});

export async function PATCH(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { user } = auth.ctx;

    const parsed = await parseJsonBody(req, updateMeSchema);
    if ("error" in parsed) return parsed.error;

    if (Object.keys(parsed.data).length === 0) {
      return errorResponse(422, "no_fields", "No updatable fields were provided.");
    }

    const [updated] = await db
      .update(users)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(users.id, user.id))
      .returning();

    await writeAuditLog({
      userId: user.id,
      action: "user.profile_updated",
      resourceType: "user",
      resourceId: user.id,
      ipAddress: clientIpFromRequest(req),
    });

    return NextResponse.json({
      user: { id: updated.id, email: updated.email, displayName: updated.displayName },
    });
  });
}
