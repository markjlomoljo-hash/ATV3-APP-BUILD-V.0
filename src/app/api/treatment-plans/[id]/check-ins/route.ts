import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { treatmentPlans, planCheckIns } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { notFound, parseJsonBody, withErrorHandling } from "@/lib/http";
import { planCheckInSchema } from "@/lib/validation/treatment";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;
    const { id } = await params;

    const [plan] = await db
      .select({ id: treatmentPlans.id })
      .from(treatmentPlans)
      .where(and(eq(treatmentPlans.id, id), eq(treatmentPlans.userId, userId)))
      .limit(1);
    if (!plan) return notFound("Treatment plan");

    const parsed = await parseJsonBody(req, planCheckInSchema);
    if ("error" in parsed) return parsed.error;

    const [checkIn] = await db
      .insert(planCheckIns)
      .values({ treatmentPlanId: id, userId, ...parsed.data })
      .returning();

    return NextResponse.json({ checkIn }, { status: 201 });
  });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;
    const { id } = await params;

    const [plan] = await db
      .select({ id: treatmentPlans.id })
      .from(treatmentPlans)
      .where(and(eq(treatmentPlans.id, id), eq(treatmentPlans.userId, userId)))
      .limit(1);
    if (!plan) return notFound("Treatment plan");

    const checkIns = await db.select().from(planCheckIns).where(eq(planCheckIns.treatmentPlanId, id));
    return NextResponse.json({ checkIns });
  });
}
