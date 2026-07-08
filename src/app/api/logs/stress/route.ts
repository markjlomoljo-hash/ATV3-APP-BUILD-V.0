import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { stressLogs } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { parseJsonBody, parseQuery, withErrorHandling } from "@/lib/http";
import { stressLogSchema, listQuerySchema } from "@/lib/validation/logs";
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

    const conditions = [eq(stressLogs.userId, auth.ctx.user.id)];
    if (from) conditions.push(gte(stressLogs.logDate, from));
    if (to) conditions.push(lte(stressLogs.logDate, to));

    const rows = await db
      .select()
      .from(stressLogs)
      .where(and(...conditions))
      .orderBy(desc(stressLogs.logDate))
      .limit(limit ?? 60);

    return NextResponse.json({ stressLogs: rows });
  });
}

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;

    const parsed = await parseJsonBody(req, stressLogSchema);
    if ("error" in parsed) return parsed.error;
    const body = parsed.data;
    const logDate = body.logDate ?? toDateOnly();

    const [row] = await db
      .insert(stressLogs)
      .values({
        userId,
        logDate,
        stressLevel: body.stressLevel,
        triggers: body.triggers ?? [],
        copingActions: body.copingActions ?? [],
        notes: body.notes,
      })
      .onConflictDoUpdate({
        target: [stressLogs.userId, stressLogs.logDate],
        set: {
          stressLevel: body.stressLevel,
          triggers: body.triggers ?? [],
          copingActions: body.copingActions ?? [],
          notes: body.notes,
          updatedAt: new Date(),
        },
      })
      .returning();

    await writeAuditLog({ userId, action: "log.stress_upserted", resourceType: "stress_log", resourceId: row.id });

    return NextResponse.json({ stressLog: row });
  });
}
