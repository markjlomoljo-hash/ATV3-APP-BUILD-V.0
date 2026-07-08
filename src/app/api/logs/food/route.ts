import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { foodLogs } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { parseJsonBody, parseQuery, withErrorHandling } from "@/lib/http";
import { foodLogSchema, listQuerySchema } from "@/lib/validation/logs";
import { toDateOnly } from "@/lib/dates";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const query = parseQuery(req.nextUrl.searchParams, listQuerySchema);
    if ("error" in query) return query.error;
    const { from, to, limit } = query.data;

    const conditions = [eq(foodLogs.userId, auth.ctx.user.id)];
    if (from) conditions.push(gte(foodLogs.logDate, from));
    if (to) conditions.push(lte(foodLogs.logDate, to));

    const rows = await db
      .select()
      .from(foodLogs)
      .where(and(...conditions))
      .orderBy(desc(foodLogs.logDate))
      .limit(limit ?? 60);

    return NextResponse.json({ foodLogs: rows });
  });
}

/** Creates or updates today's (or a specified date's) food log container. */
export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;

    const parsed = await parseJsonBody(req, foodLogSchema);
    if ("error" in parsed) return parsed.error;
    const body = parsed.data;
    const logDate = body.logDate ?? toDateOnly();

    const [row] = await db
      .insert(foodLogs)
      .values({
        userId,
        logDate,
        baselineMealsPerDay: body.baselineMealsPerDay,
        completionState: body.completionState ?? "incomplete",
        notes: body.notes,
      })
      .onConflictDoUpdate({
        target: [foodLogs.userId, foodLogs.logDate],
        set: {
          baselineMealsPerDay: body.baselineMealsPerDay,
          completionState: body.completionState ?? "incomplete",
          notes: body.notes,
          updatedAt: new Date(),
        },
      })
      .returning();

    await writeAuditLog({ userId, action: "log.food_upserted", resourceType: "food_log", resourceId: row.id });

    return NextResponse.json({ foodLog: row });
  });
}
