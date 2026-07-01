import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { forecasts, forecastOutcomeFeedback } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { notFound, parseJsonBody, withErrorHandling } from "@/lib/http";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

const feedbackSchema = z.object({
  outcomeReported: z.string().max(1000).optional(),
  matchedPrediction: z.enum(["yes", "no", "partial", "unknown"]),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;
    const { id } = await params;

    const [forecast] = await db
      .select({ id: forecasts.id })
      .from(forecasts)
      .where(and(eq(forecasts.id, id), eq(forecasts.userId, userId)))
      .limit(1);
    if (!forecast) return notFound("Forecast");

    const parsed = await parseJsonBody(req, feedbackSchema);
    if ("error" in parsed) return parsed.error;

    const [feedback] = await db
      .insert(forecastOutcomeFeedback)
      .values({ forecastId: id, userId, ...parsed.data })
      .returning();

    await writeAuditLog({ userId, action: "forecast.feedback_submitted", resourceType: "forecast", resourceId: id });

    return NextResponse.json({ feedback }, { status: 201 });
  });
}
