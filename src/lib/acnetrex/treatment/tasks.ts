import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { treatmentPlans, treatmentTasks } from "@/db/schema";

export const treatmentTaskRequestSchema = z.object({
  planId: z.string().uuid(),
  taskName: z.string().trim().min(1).max(200),
  dueAt: z.string().datetime({ offset: true }).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const treatmentTaskCompletionSchema = z.object({ skipped: z.boolean() });

type TaskInput = z.infer<typeof treatmentTaskRequestSchema>;
type CompletionInput = z.infer<typeof treatmentTaskCompletionSchema>;

function mapTask(row: typeof treatmentTasks.$inferSelect) {
  return {
    id: row.id,
    planId: row.planId,
    userId: row.userId,
    taskName: row.taskName,
    dueAt: row.dueAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    skipped: row.skipped,
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function createTreatmentTask(userId: string, input: TaskInput) {
  const db = getDb();
  const [plan] = await db
    .select({ id: treatmentPlans.id })
    .from(treatmentPlans)
    .where(and(eq(treatmentPlans.id, input.planId), eq(treatmentPlans.userId, userId)))
    .limit(1);
  if (!plan) throw new Error("treatment_plan_not_found");

  const [row] = await db
    .insert(treatmentTasks)
    .values({
      planId: input.planId,
      userId,
      taskName: input.taskName,
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
      metadata: input.metadata ?? null,
      skipped: false,
    })
    .returning();
  return mapTask(row);
}

export async function listTreatmentTasks(userId: string, planId?: string) {
  const db = getDb();
  const where = planId
    ? and(eq(treatmentTasks.userId, userId), eq(treatmentTasks.planId, planId))
    : eq(treatmentTasks.userId, userId);
  const rows = await db
    .select()
    .from(treatmentTasks)
    .where(where)
    .orderBy(asc(treatmentTasks.dueAt), desc(treatmentTasks.createdAt));
  return rows.map(mapTask);
}

export async function completeTreatmentTask(userId: string, taskId: string, input: CompletionInput) {
  const db = getDb();
  const [row] = await db
    .update(treatmentTasks)
    .set({
      completedAt: input.skipped ? null : new Date(),
      skipped: input.skipped,
    })
    .where(and(eq(treatmentTasks.id, taskId), eq(treatmentTasks.userId, userId)))
    .returning();
  if (!row) throw new Error("treatment_task_not_found");
  return mapTask(row);
}
