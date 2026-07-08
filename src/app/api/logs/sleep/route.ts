import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { sleepLogs } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { errorResponse, parseJsonBody, parseQuery, withErrorHandling } from "@/lib/http";
import { sleepLogSchema, listQuerySchema } from "@/lib/validation/logs";
import { calculateSleepDurationMinutes, toDateOnly } from "@/lib/dates";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const query = parseQuery(req.nextUrl.searchParams, listQuerySchema);
    if ("error" in query) return query.error;
    const { from, to, limit } = query.data;

    const conditions = [eq(sleepLogs.userId, auth.ctx.user.id)];
    if (from) conditions.push(gte(sleepLogs.logDate, from));
    if (to) conditions.push(lte(sleepLogs.logDate, to));

    const rows = await db
      .select()
      .from(sleepLogs)
      .where(and(...conditions))
      .orderBy(desc(sleepLogs.logDate))
      .limit(limit ?? 60);

    return NextResponse.json({ sleepLogs: rows });
  });
}

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;

    const parsed = await parseJsonBody(req, sleepLogSchema);
    if ("error" in parsed) return parsed.error;
    const body = parsed.data;

    const sleepStart = new Date(body.sleepStart);
    const wakeTime = new Date(body.wakeTime);
    if (wakeTime.getTime() <= sleepStart.getTime()) {
      return errorResponse(422, "invalid_range", "wakeTime must be after sleepStart.");
    }
    const durationMinutes = calculateSleepDurationMinutes(sleepStart, wakeTime);
    const logDate = body.logDate ?? toDateOnly(wakeTime);

    // Same-day upsert: one sleep record per user per calendar day (wake date).
    const [row] = await db
      .insert(sleepLogs)
      .values({
        userId,
        logDate,
        sleepStart,
        wakeTime,
        durationMinutes,
        quality: body.quality,
        disturbances: body.disturbances ?? [],
        naps: body.naps ?? [],
        notes: body.notes,
      })
      .onConflictDoUpdate({
        target: [sleepLogs.userId, sleepLogs.logDate],
        set: {
          sleepStart,
          wakeTime,
          durationMinutes,
          quality: body.quality,
          disturbances: body.disturbances ?? [],
          naps: body.naps ?? [],
          notes: body.notes,
          updatedAt: new Date(),
        },
      })
      .returning();

    await writeAuditLog({
      userId,
      action: "log.sleep_upserted",
      resourceType: "sleep_log",
      resourceId: row.id,
    });

    return NextResponse.json({ sleepLog: row }, { status: 200 });
  });
}
