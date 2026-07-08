import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { treatmentPlans, planSchedules } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { notFound, parseJsonBody, withErrorHandling } from "@/lib/http";
import { updateTreatmentPlanSchema } from "@/lib/validation/treatment";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

async function loadOwned(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(treatmentPlans)
    .where(and(eq(treatmentPlans.id, id), eq(treatmentPlans.userId, userId)))
    .limit(1);
  return row;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id } = await params;

    const plan = await loadOwned(auth.ctx.user.id, id);
    if (!plan) return notFound("Treatment plan");

    const schedules = await db.select().from(planSchedules).where(eq(planSchedules.treatmentPlanId, id));

    return NextResponse.json({ treatmentPlan: plan, schedules });
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;
    const { id } = await params;

    const existing = await loadOwned(userId, id);
    if (!existing) return notFound("Treatment plan");

    const parsed = await parseJsonBody(req, updateTreatmentPlanSchema);
    if ("error" in parsed) return parsed.error;
    const { endDate, ...rest } = parsed.data;

    const [plan] = await db
      .update(treatmentPlans)
      .set({ ...rest, endDate: endDate ? new Date(endDate) : undefined, updatedAt: new Date() })
      .where(eq(treatmentPlans.id, id))
      .returning();

    await writeAuditLog({ userId, action: "treatment_plan.updated", resourceType: "treatment_plan", resourceId: id });

    return NextResponse.json({ treatmentPlan: plan });
  });
}
