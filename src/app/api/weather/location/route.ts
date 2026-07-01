import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { locationPreferences } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { parseJsonBody, withErrorHandling } from "@/lib/http";
import { updateLocationSchema } from "@/lib/validation/weather";
import { encodeGeohash } from "@/lib/geohash";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const [row] = await db
      .select()
      .from(locationPreferences)
      .where(eq(locationPreferences.userId, auth.ctx.user.id))
      .limit(1);

    return NextResponse.json({ location: row ?? { permissionState: "not_requested" } });
  });
}

export async function PUT(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;

    const parsed = await parseJsonBody(req, updateLocationSchema);
    if ("error" in parsed) return parsed.error;
    const { permissionState, latitude, longitude, labelName } = parsed.data;

    // Only a coarse geohash is ever persisted — precise GPS is discarded
    // immediately after this computation.
    const geohash =
      permissionState === "granted" && latitude !== undefined && longitude !== undefined
        ? encodeGeohash(latitude, longitude, 5)
        : undefined;

    const [row] = await db
      .insert(locationPreferences)
      .values({ userId, permissionState, geohash, labelName })
      .onConflictDoUpdate({
        target: locationPreferences.userId,
        set: { permissionState, geohash, labelName, updatedAt: new Date() },
      })
      .returning();

    await writeAuditLog({ userId, action: "weather.location_preference_updated", resourceType: "location_preference", resourceId: userId, metadata: { permissionState } });

    return NextResponse.json({ location: row });
  });
}
