import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { forecasts } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { parseJsonBody, withErrorHandling } from "@/lib/http";
import { evaluateReadiness } from "@/lib/services/aiReadiness";
import { enqueueJob } from "@/lib/jobs";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const rows = await db
      .select()
      .from(forecasts)
      .where(eq(forecasts.userId, auth.ctx.user.id))
      .orderBy(desc(forecasts.createdAt))
      .limit(30);

    return NextResponse.json({ forecasts: rows });
  });
}

const requestForecastSchema = z.object({
  forecastFor: z.string().datetime().optional(),
});

/**
 * Requests a forecast. Because no trained forecasting model is configured in
 * this backend yet, the record is created honestly as "insufficient_data"
 * and a background job is enqueued for when a real model becomes available —
 * it is never filled with a fabricated prediction.
 */
export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;

    const parsed = await parseJsonBody(req, requestForecastSchema);
    if ("error" in parsed) return parsed.error;

    const readiness = await evaluateReadiness(userId);
    const relevant = readiness.find((d) => d.domain === "trigger_graph");
    const confidenceLabel =
      relevant?.modelStatus === "not_configured" || !relevant
        ? "insufficient_data"
        : relevant.readiness === "early_hypothesis_eligible"
          ? "early_hypothesis"
          : "insufficient_data";

    const forecastFor = parsed.data.forecastFor ? new Date(parsed.data.forecastFor) : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const [forecast] = await db
      .insert(forecasts)
      .values({
        userId,
        forecastFor,
        confidenceLabel,
        payload: null,
      })
      .returning();

    await enqueueJob("forecast_generate", { forecastId: forecast.id }, { userId });
    await writeAuditLog({ userId, action: "forecast.requested", resourceType: "forecast", resourceId: forecast.id });

    return NextResponse.json({ forecast }, { status: 202 });
  });
}
