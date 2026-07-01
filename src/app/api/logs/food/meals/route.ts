import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { foodLogs, mealEvents } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { parseJsonBody, parseQuery, withErrorHandling } from "@/lib/http";
import { mealEventSchema, listQuerySchema } from "@/lib/validation/logs";
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

    const conditions = [eq(mealEvents.userId, auth.ctx.user.id)];
    if (from) conditions.push(gte(mealEvents.occurredAt, new Date(from)));
    if (to) conditions.push(lte(mealEvents.occurredAt, new Date(`${to}T23:59:59.999Z`)));

    const rows = await db
      .select()
      .from(mealEvents)
      .where(and(...conditions))
      .orderBy(desc(mealEvents.occurredAt))
      .limit(limit ?? 100);

    return NextResponse.json({ mealEvents: rows });
  });
}

/**
 * Adds a discrete meal/snack event. Multiple events per day are expected and
 * intentional (breakfast, lunch, snacks, ...) — this endpoint always creates
 * a new row rather than upserting, and lazily creates the parent day's
 * food_logs container if it does not exist yet.
 */
export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;

    const parsed = await parseJsonBody(req, mealEventSchema);
    if ("error" in parsed) return parsed.error;
    const body = parsed.data;
    const occurredAt = new Date(body.occurredAt);
    const logDate = body.logDate ?? toDateOnly(occurredAt);

    const [foodLog] = await db
      .insert(foodLogs)
      .values({ userId, logDate })
      .onConflictDoUpdate({
        target: [foodLogs.userId, foodLogs.logDate],
        set: { updatedAt: new Date() },
      })
      .returning();

    const [meal] = await db
      .insert(mealEvents)
      .values({
        foodLogId: foodLog.id,
        userId,
        eventType: body.eventType,
        category: body.category,
        occurredAt,
        description: body.description,
        portionSize: body.portionSize,
        items: body.items ?? [],
        notes: body.notes,
      })
      .returning();

    await writeAuditLog({ userId, action: "log.meal_event_created", resourceType: "meal_event", resourceId: meal.id });

    return NextResponse.json({ mealEvent: meal }, { status: 201 });
  });
}
