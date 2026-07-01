import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { locationPreferences, weatherSnapshots } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { errorResponse, withErrorHandling } from "@/lib/http";
import { fetchWeatherForGeohash } from "@/lib/services/weatherService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const [latest] = await db
      .select()
      .from(weatherSnapshots)
      .where(eq(weatherSnapshots.userId, auth.ctx.user.id))
      .orderBy(desc(weatherSnapshots.capturedAt))
      .limit(1);

    if (!latest) {
      return NextResponse.json({ status: "insufficient_data", snapshot: null });
    }
    return NextResponse.json({ status: "ok", snapshot: latest });
  });
}

/** Fetches a fresh weather snapshot server-side and persists it durably. */
export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;

    const [location] = await db
      .select()
      .from(locationPreferences)
      .where(eq(locationPreferences.userId, userId))
      .limit(1);

    if (!location || location.permissionState !== "granted" || !location.geohash) {
      return errorResponse(
        422,
        "location_not_available",
        "Location permission has not been granted, so weather data is unavailable.",
      );
    }

    const result = await fetchWeatherForGeohash(location.geohash);

    const [snapshot] = await db
      .insert(weatherSnapshots)
      .values({
        userId,
        geohash: location.geohash,
        source: "open-meteo",
        temperatureC: result.temperatureC?.toString(),
        humidityPct: result.humidityPct?.toString(),
        uvIndex: result.uvIndex?.toString(),
        airQualityIndex: result.airQualityIndex?.toString(),
        confidence: result.confidence,
        rawPayload: result.rawPayload,
      })
      .returning();

    return NextResponse.json({ snapshot }, { status: 201 });
  });
}
