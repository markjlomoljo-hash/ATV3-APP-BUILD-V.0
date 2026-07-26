// AcneTrex V3 — Deterministic treatment task generation.
//
// Tasks are generated only from the explicit `steps` array persisted in a
// treatment plan's schedule (written at plan creation from the validated
// draft). Rules, all documented and fail-closed:
//
// - A plan generates instances for a UTC calendar day D only when its status
//   is "active", its started_at UTC day <= D, and its ended_at is null or its
//   ended_at UTC day >= D. An active plan without a real start date generates
//   nothing (no invented start).
// - Cadence is explicit per step (am | pm | both). AM instances are due at
//   D T08:00Z and PM instances at D T20:00Z — a fixed, documented UTC
//   convention, since the canonical schema stores no user timezone.
// - Every generated task carries metadata.generationKey =
//   `${planId}:${date}:${stepIndex}:${slot}`; regeneration is idempotent
//   because instances whose key already exists are skipped, and the database
//   is the final arbiter: a partial unique index on
//   (user_id, metadata->>'generationKey') (migration
//   20260726093000_treatment_tasks_generation_key_unique) plus
//   ON CONFLICT DO NOTHING means two CONCURRENT generate calls — which both
//   pass the app-level read-then-insert check — can never duplicate a day's
//   board. The loser's conflicted rows are reported as skippedExisting.
// - Plans without steps (or with malformed step config) generate nothing and
//   the caller receives status "no_steps_defined" — never invented routines.
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { treatmentPlans, treatmentTasks } from "@/db/schema";
import { calendarDateSchema, treatmentPlanStepSchema } from "@/lib/acnetrex/modules/schemas";
import { mapTreatmentTask } from "@/lib/acnetrex/treatment/tasks";
import { utcDayOf } from "@/lib/acnetrex/gamification/rules";

export const AM_DUE_TIME_UTC = "08:00:00.000Z";
export const PM_DUE_TIME_UTC = "20:00:00.000Z";
export const GENERATED_TASK_SOURCE = "plan_step_generation";

export const taskGenerationRequestSchema = z.object({
  date: calendarDateSchema,
  planId: z.string().uuid().optional(),
});

type GenerationInput = z.infer<typeof taskGenerationRequestSchema>;
export type PlanStep = z.infer<typeof treatmentPlanStepSchema>;

const planScheduleStepsSchema = z.object({
  steps: z.array(treatmentPlanStepSchema).max(20).optional(),
});

/**
 * Extracts the validated steps from a plan schedule. Malformed or missing
 * step configuration yields [] (fail-closed: nothing is generated from
 * configuration that cannot be validated).
 */
export function extractPlanSteps(schedule: unknown): PlanStep[] {
  const parsed = planScheduleStepsSchema.safeParse(schedule);
  return parsed.success ? (parsed.data.steps ?? []) : [];
}

/** Whether an owner plan covers the target UTC day (see module rules). */
export function planCoversUtcDay(
  plan: { status: string; startedAt: Date | null; endedAt: Date | null },
  date: string,
): boolean {
  if (plan.status !== "active") return false;
  if (!(plan.startedAt instanceof Date)) return false;
  if (utcDayOf(plan.startedAt) > date) return false;
  if (plan.endedAt instanceof Date && utcDayOf(plan.endedAt) < date) return false;
  return true;
}

export type GenerationSlot = "am" | "pm";

export interface GeneratedTaskInstance {
  planId: string;
  taskName: string;
  dueAt: Date;
  metadata: {
    source: typeof GENERATED_TASK_SOURCE;
    generationKey: string;
    date: string;
    stepIndex: number;
    slot: GenerationSlot;
  };
}

const SLOTS_BY_TIME_OF_DAY: Record<PlanStep["timeOfDay"], GenerationSlot[]> = {
  am: ["am"],
  pm: ["pm"],
  both: ["am", "pm"],
};

/** Pure, deterministic expansion of a plan's steps into task instances. */
export function buildTaskInstances(
  plan: { id: string; schedule: unknown },
  date: string,
): GeneratedTaskInstance[] {
  return extractPlanSteps(plan.schedule).flatMap((step, stepIndex) =>
    SLOTS_BY_TIME_OF_DAY[step.timeOfDay].map((slot) => ({
      planId: plan.id,
      taskName: `${step.name} (${slot.toUpperCase()})`,
      dueAt: new Date(`${date}T${slot === "am" ? AM_DUE_TIME_UTC : PM_DUE_TIME_UTC}`),
      metadata: {
        source: GENERATED_TASK_SOURCE,
        generationKey: `${plan.id}:${date}:${stepIndex}:${slot}`,
        date,
        stepIndex,
        slot,
      },
    })),
  );
}

export function generationKeyOf(metadata: unknown): string | null {
  if (metadata && typeof metadata === "object" && "generationKey" in metadata) {
    const key = (metadata as { generationKey: unknown }).generationKey;
    return typeof key === "string" ? key : null;
  }
  return null;
}

export type TaskGenerationResult =
  | { status: "no_active_plan"; tasks: []; skippedExisting: 0 }
  | { status: "no_steps_defined"; tasks: []; skippedExisting: 0 }
  | { status: "up_to_date"; tasks: []; skippedExisting: number }
  | { status: "generated"; tasks: ReturnType<typeof mapTreatmentTask>[]; skippedExisting: number };

/**
 * Generates the target day's tasks for the user's active plan steps.
 * Owner-scoped, deterministic, and idempotent: re-running for the same day
 * inserts nothing and reports "up_to_date".
 */
export async function generateTreatmentTasks(
  userId: string,
  input: GenerationInput,
): Promise<TaskGenerationResult> {
  const db = getDb();
  const where = input.planId
    ? and(eq(treatmentPlans.userId, userId), eq(treatmentPlans.id, input.planId))
    : eq(treatmentPlans.userId, userId);
  const planRows = await db.select().from(treatmentPlans).where(where);
  if (input.planId && planRows.length === 0) throw new Error("treatment_plan_not_found");

  const coveringPlans = planRows.filter((plan) => planCoversUtcDay(plan, input.date));
  if (coveringPlans.length === 0) return { status: "no_active_plan", tasks: [], skippedExisting: 0 };

  const instances = coveringPlans.flatMap((plan) => buildTaskInstances(plan, input.date));
  if (instances.length === 0) return { status: "no_steps_defined", tasks: [], skippedExisting: 0 };

  const existingRows = await db
    .select({ metadata: treatmentTasks.metadata })
    .from(treatmentTasks)
    .where(eq(treatmentTasks.userId, userId));
  const existingKeys = new Set(
    existingRows.map((row) => generationKeyOf(row.metadata)).filter((key) => key !== null),
  );
  const toInsert = instances.filter(
    (instance) => !existingKeys.has(instance.metadata.generationKey),
  );
  if (toInsert.length === 0) {
    return { status: "up_to_date", tasks: [], skippedExisting: instances.length };
  }

  // ON CONFLICT DO NOTHING against the partial unique index on
  // (user_id, metadata->>'generationKey') is the concurrency backstop: a
  // parallel generate call (different idempotency key, same day) that raced
  // past the read above loses here instead of duplicating rows. RETURNING
  // yields only the rows this call actually inserted, so the result is
  // honest about what happened under the race.
  const rows = await db
    .insert(treatmentTasks)
    .values(
      toInsert.map((instance) => ({
        planId: instance.planId,
        userId,
        taskName: instance.taskName,
        dueAt: instance.dueAt,
        metadata: instance.metadata,
        skipped: false,
      })),
    )
    .onConflictDoNothing()
    .returning();
  if (rows.length === 0) {
    // Every remaining instance was inserted concurrently by another call.
    return { status: "up_to_date", tasks: [], skippedExisting: instances.length };
  }
  return {
    status: "generated",
    tasks: rows.map(mapTreatmentTask),
    skippedExisting: instances.length - rows.length,
  };
}
