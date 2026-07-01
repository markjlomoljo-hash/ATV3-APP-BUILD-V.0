import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { contactLogs } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { parseJsonBody, parseQuery, withErrorHandling } from "@/lib/http";
import { contactLogSchema, listQuerySchema } from "@/lib/validation/logs";
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

    const conditions = [eq(contactLogs.userId, auth.ctx.user.id)];
    if (from) conditions.push(gte(contactLogs.logDate, from));
    if (to) conditions.push(lte(contactLogs.logDate, to));

    const rows = await db
      .select()
      .from(contactLogs)
      .where(and(...conditions))
      .orderBy(desc(contactLogs.logDate))
      .limit(limit ?? 100);

    return NextResponse.json({ contactLogs: rows });
  });
}

/**
 * Contact/occlusion events are additive within a day (e.g. helmet AND phone
 * contact can both occur), so this endpoint always appends a new event
 * rather than upserting a single per-day row.
 */
export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;

    const parsed = await parseJsonBody(req, contactLogSchema);
    if ("error" in parsed) return parsed.error;
    const { logDate: providedLogDate, ...fields } = parsed.data;
    const logDate = providedLogDate ?? toDateOnly();

    const [row] = await db
      .insert(contactLogs)
      .values({ userId, logDate, ...fields })
      .returning();

    await writeAuditLog({ userId, action: "log.contact_created", resourceType: "contact_log", resourceId: row.id });

    return NextResponse.json({ contactLog: row }, { status: 201 });
  });
}
