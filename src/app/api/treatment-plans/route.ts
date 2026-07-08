import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { treatmentPlans, planSchedules } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { parseJsonBody, withErrorHandling } from "@/lib/http";
import { createTreatmentPlanSchema } from "@/lib/validation/treatment";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const rows = await db
      .select()
      .from(treatmentPlans)
      .where(eq(treatmentPlans.userId, auth.ctx.user.id))
      .orderBy(desc(treatmentPlans.createdAt));

    return NextResponse.json({ treatmentPlans: rows });
  });
}

/**
 * Creates a treatment plan the user organizes and tracks. This never
 * prescribes or modifies medications — `providerDirected` simply records
 * whether a licensed provider directed the plan; the app does not act as one.
 */
export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;

    const parsed = await parseJsonBody(req, createTreatmentPlanSchema);
    if ("error" in parsed) return parsed.error;
    const { schedules, startDate, endDate, ...fields } = parsed.data;

    const [plan] = await db
      .insert(treatmentPlans)
      .values({
        userId,
        ...fields,
        status: "draft",
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      })
      .returning();

    let insertedSchedules: (typeof planSchedules.$inferSelect)[] = [];
    if (schedules && schedules.length > 0) {
      insertedSchedules = await db
        .insert(planSchedules)
        .values(schedules.map((s) => ({ treatmentPlanId: plan.id, ...s })))
        .returning();
    }

    await writeAuditLog({ userId, action: "treatment_plan.created", resourceType: "treatment_plan", resourceId: plan.id });

    return NextResponse.json({ treatmentPlan: plan, schedules: insertedSchedules }, { status: 201 });
  });
}
