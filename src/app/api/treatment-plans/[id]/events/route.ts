import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { treatmentPlans, planEvents } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { notFound, parseJsonBody, withErrorHandling } from "@/lib/http";
import { planEventSchema } from "@/lib/validation/treatment";

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

    const parsed = await parseJsonBody(req, planEventSchema);
    if ("error" in parsed) return parsed.error;
    const { occurredAt, ...rest } = parsed.data;

    const [event] = await db
      .insert(planEvents)
      .values({ treatmentPlanId: id, userId, occurredAt: occurredAt ? new Date(occurredAt) : new Date(), ...rest })
      .returning();

    return NextResponse.json({ event }, { status: 201 });
  });
}
