import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { routineAdherenceLogs } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { parseJsonBody, withErrorHandling } from "@/lib/http";
import { toDateOnly } from "@/lib/dates";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

const adherenceSchema = z.object({
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  routineId: z.string().uuid().optional(),
  timeOfDay: z.enum(["morning", "evening"]),
  completed: z.boolean(),
  stepsCompleted: z.array(z.string().uuid()).max(50).optional(),
  notes: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;

    const parsed = await parseJsonBody(req, adherenceSchema);
    if ("error" in parsed) return parsed.error;
    const { logDate: providedLogDate, ...fields } = parsed.data;
    const logDate = providedLogDate ?? toDateOnly();

    const [row] = await db
      .insert(routineAdherenceLogs)
      .values({ userId, logDate, ...fields })
      .onConflictDoUpdate({
        target: [routineAdherenceLogs.userId, routineAdherenceLogs.logDate, routineAdherenceLogs.timeOfDay],
        set: { ...fields, updatedAt: new Date() },
      })
      .returning();

    await writeAuditLog({ userId, action: "routine.adherence_logged", resourceType: "routine_adherence_log", resourceId: row.id });

    return NextResponse.json({ adherence: row });
  });
}
