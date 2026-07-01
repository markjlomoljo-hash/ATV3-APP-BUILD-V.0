import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { cycleLogs } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { parseJsonBody, parseQuery, withErrorHandling } from "@/lib/http";
import { cycleLogSchema, listQuerySchema } from "@/lib/validation/logs";
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

    const conditions = [eq(cycleLogs.userId, auth.ctx.user.id)];
    if (from) conditions.push(gte(cycleLogs.logDate, from));
    if (to) conditions.push(lte(cycleLogs.logDate, to));

    const rows = await db
      .select()
      .from(cycleLogs)
      .where(and(...conditions))
      .orderBy(desc(cycleLogs.logDate))
      .limit(limit ?? 60);

    return NextResponse.json({ cycleLogs: rows });
  });
}

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;

    const parsed = await parseJsonBody(req, cycleLogSchema);
    if ("error" in parsed) return parsed.error;
    const { logDate: providedLogDate, ...fields } = parsed.data;
    const logDate = providedLogDate ?? toDateOnly();

    const [row] = await db
      .insert(cycleLogs)
      .values({ userId, logDate, ...fields })
      .onConflictDoUpdate({
        target: [cycleLogs.userId, cycleLogs.logDate],
        set: { ...fields, updatedAt: new Date() },
      })
      .returning();

    await writeAuditLog({ userId, action: "log.cycle_upserted", resourceType: "cycle_log", resourceId: row.id });

    return NextResponse.json({ cycleLog: row });
  });
}
