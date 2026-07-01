import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { aiReadinessEvents, consentReviews, pointsLedger, taskCompletions, tasks } from "@/db/schema";
import { ApiError } from "@/lib/api-helpers";
import { localDateInTimezone } from "@/lib/dates";
import type { SessionUser } from "@/lib/auth";
import { recomputeDailySummary } from "./task-generation";
import { recomputeStreak } from "./streaks";
import { syncProgress } from "./progress";

export type CompleteTaskInput = {
  clientCompletionId: string;
  source?: "online" | "offline_sync";
  completedAtLocalDate?: string;
};

export async function completeTask(user: SessionUser, taskId: string, input: CompleteTaskInput) {
  // Idempotency: if this exact client completion was already processed
  // (e.g. retried from the offline queue), return the same result instead
  // of awarding points twice.
  const existingByClientId = await db
    .select()
    .from(taskCompletions)
    .where(eq(taskCompletions.clientCompletionId, input.clientCompletionId))
    .limit(1);
  if (existingByClientId[0]) {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
    return { task, completion: existingByClientId[0], duplicate: true };
  }

  const [task] = await db.select().from(tasks).where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id))).limit(1);
  if (!task) throw new ApiError(404, "Task not found.");
  if (task.status === "completed") {
    throw new ApiError(409, "This task was already completed.");
  }

  const localDate = input.completedAtLocalDate ?? localDateInTimezone(user.timezone);

  const [completion] = await db
    .insert(taskCompletions)
    .values({
      id: randomUUID(),
      taskId: task.id,
      userId: user.id,
      clientCompletionId: input.clientCompletionId,
      source: input.source ?? "online",
      localDate,
      pointsAwarded: task.points,
    })
    .returning();

  await db.update(tasks).set({ status: "completed", completedAt: new Date() }).where(eq(tasks.id, task.id));

  await db.insert(pointsLedger).values({
    id: randomUUID(),
    userId: user.id,
    taskId: task.id,
    points: task.points,
    reason: task.title,
    category: task.category,
  });

  await db.insert(aiReadinessEvents).values({
    id: randomUUID(),
    userId: user.id,
    module: task.category,
    delta: Math.ceil(task.points / 2),
    reason: `Completed: ${task.title}`,
  });

  if (task.templateId === "consent_review") {
    await db.insert(consentReviews).values({ id: randomUUID(), userId: user.id, version: "v1" });
  }

  await recomputeDailySummary(user.id, task.taskDate as unknown as string);
  await recomputeStreak(user.id, user.timezone);
  const progress = await syncProgress(user.id);

  return { task: { ...task, status: "completed" }, completion, duplicate: false, progress };
}

/** Allows undoing a completion only for a task completed *today* in the
 * user's own timezone — past days are never editable, to keep streak
 * history honest. */
export async function uncompleteTaskIfAllowed(user: SessionUser, taskId: string) {
  const [task] = await db.select().from(tasks).where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id))).limit(1);
  if (!task) throw new ApiError(404, "Task not found.");
  if (task.status !== "completed") throw new ApiError(409, "Task is not completed.");

  const today = localDateInTimezone(user.timezone);
  if ((task.taskDate as unknown as string) !== today) {
    throw new ApiError(422, "Only tasks completed earlier today can be undone.");
  }

  await db.delete(taskCompletions).where(eq(taskCompletions.taskId, task.id));
  await db.insert(pointsLedger).values({
    id: randomUUID(),
    userId: user.id,
    taskId: task.id,
    points: -task.points,
    reason: `Reversed: ${task.title}`,
    category: task.category,
  });
  await db.update(tasks).set({ status: "pending", completedAt: null }).where(eq(tasks.id, task.id));

  await recomputeDailySummary(user.id, today);
  await recomputeStreak(user.id, user.timezone);
  const progress = await syncProgress(user.id);

  return { task: { ...task, status: "pending" }, progress };
}
