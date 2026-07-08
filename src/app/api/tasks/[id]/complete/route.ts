import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { tasks, taskCompletions, pointsLedger } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { notFound, withErrorHandling } from "@/lib/http";
import { writeAuditLog } from "@/lib/audit";
import { touchStreak } from "@/lib/services/gamificationService";

export const dynamic = "force-dynamic";

/**
 * Marks a task complete and awards real points based on the task's own
 * configured `pointsValue`. Nothing here invents a score — the ledger entry
 * always mirrors the task record.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;
    const { id } = await params;

    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .limit(1);
    if (!task) return notFound("Task");

    const [completion] = await db
      .insert(taskCompletions)
      .values({ taskId: id, userId, pointsAwarded: task.pointsValue })
      .returning();

    await db.insert(pointsLedger).values({
      userId,
      delta: task.pointsValue,
      reason: `task_completed:${task.title}`,
      referenceId: completion.id,
    });

    const streak = await touchStreak(userId);

    await writeAuditLog({ userId, action: "task.completed", resourceType: "task", resourceId: id, metadata: { pointsAwarded: task.pointsValue } });

    return NextResponse.json({ completion, streak }, { status: 201 });
  });
}
