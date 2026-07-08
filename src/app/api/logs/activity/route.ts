import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { parseJsonBody, parseQuery, withErrorHandling } from "@/lib/http";
import { activityLogSchema, listQuerySchema } from "@/lib/validation/logs";
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

    const conditions = [eq(activityLogs.userId, auth.ctx.user.id)];
    if (from) conditions.push(gte(activityLogs.logDate, from));
    if (to) conditions.push(lte(activityLogs.logDate, to));

    const rows = await db
      .select()
      .from(activityLogs)
      .where(and(...conditions))
      .orderBy(desc(activityLogs.logDate))
      .limit(limit ?? 60);

    return NextResponse.json({ activityLogs: rows });
  });
}

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;

    const parsed = await parseJsonBody(req, activityLogSchema);
    if ("error" in parsed) return parsed.error;
    const body = parsed.data;
    const logDate = body.logDate ?? toDateOnly();

    const { logDate: _ignoredLogDate, ...activityFields } = body;
    void _ignoredLogDate;

    const [row] = await db
      .insert(activityLogs)
      .values({ userId, logDate, ...activityFields })
      .onConflictDoUpdate({
        target: [activityLogs.userId, activityLogs.logDate],
        set: { ...activityFields, updatedAt: new Date() },
      })
      .returning();

    await writeAuditLog({ userId, action: "log.activity_upserted", resourceType: "activity_log", resourceId: row.id });

    return NextResponse.json({ activityLog: row });
  });
}
