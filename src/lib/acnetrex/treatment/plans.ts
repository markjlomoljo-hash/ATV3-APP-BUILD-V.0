import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { treatmentCheckins, treatmentPlans } from "@/db/schema";
import { treatmentPlanDraftSchema } from "@/lib/acnetrex/modules/schemas";

export const treatmentPlanRequestSchema = treatmentPlanDraftSchema;

export const treatmentCheckinRequestSchema = z.object({
  planId: z.string().uuid(),
  checkinDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["used", "skipped", "delayed", "partial", "stopped"]),
  irritation: z.number().int().min(0).max(10).nullable().optional(),
  notes: z.string().max(2000).optional(),
});

export class TreatmentSafetyError extends Error {
  constructor(message = "provider_directed_treatment_required") {
    super(message);
    this.name = "TreatmentSafetyError";
  }
}

type PlanInput = z.infer<typeof treatmentPlanRequestSchema>;
type CheckinInput = z.infer<typeof treatmentCheckinRequestSchema>;

function mapPlan(row: typeof treatmentPlans.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    startedAt: row.startedAt?.toISOString() ?? null,
    endedAt: row.endedAt?.toISOString() ?? null,
    schedule: row.schedule,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapCheckin(row: typeof treatmentCheckins.$inferSelect) {
  return {
    id: row.id,
    planId: row.planId,
    checkinDate: row.checkinDate,
    status: row.status,
    irritation: row.irritation,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function createTreatmentPlan(userId: string, input: PlanInput) {
  if (!input.providerDirected) throw new TreatmentSafetyError();
  const db = getDb();
  const [row] = await db
    .insert(treatmentPlans)
    .values({
      userId,
      title: input.name,
      description: input.instructions ?? null,
      schedule: {
        activeIngredient: input.activeIngredient ?? null,
        reviewDate: input.reviewDate ?? null,
        providerDirected: true,
      },
      status: "active",
      startedAt: new Date(`${input.startDate}T00:00:00.000Z`),
    })
    .returning();
  return mapPlan(row);
}

export async function listTreatmentPlans(userId: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(treatmentPlans)
    .where(eq(treatmentPlans.userId, userId))
    .orderBy(desc(treatmentPlans.createdAt));
  return rows.map(mapPlan);
}

export async function createTreatmentCheckin(userId: string, input: CheckinInput) {
  const db = getDb();
  const [plan] = await db
    .select({ id: treatmentPlans.id })
    .from(treatmentPlans)
    .where(and(eq(treatmentPlans.id, input.planId), eq(treatmentPlans.userId, userId)))
    .limit(1);
  if (!plan) throw new Error("treatment_plan_not_found");

  const [row] = await db
    .insert(treatmentCheckins)
    .values({
      planId: input.planId,
      userId,
      checkinDate: input.checkinDate,
      status: input.status,
      irritation: input.irritation ?? null,
      notes: input.notes ?? null,
    })
    .returning();
  return mapCheckin(row);
}

export async function listTreatmentCheckins(userId: string, planId?: string) {
  const db = getDb();
  const where = planId
    ? and(eq(treatmentCheckins.userId, userId), eq(treatmentCheckins.planId, planId))
    : eq(treatmentCheckins.userId, userId);
  const rows = await db
    .select()
    .from(treatmentCheckins)
    .where(where)
    .orderBy(asc(treatmentCheckins.checkinDate), desc(treatmentCheckins.createdAt));
  return rows.map(mapCheckin);
}
