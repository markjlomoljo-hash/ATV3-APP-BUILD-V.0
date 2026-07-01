import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { dailyTaskSummaries, tasks } from "@/db/schema";
import { requireSessionUser } from "@/lib/auth";
import { jsonOk, withApiHandler } from "@/lib/api-helpers";
import { localDateInTimezone } from "@/lib/dates";
import { generateTasksForToday } from "@/lib/gamification/task-generation";
import { getRestoresRemaining } from "@/lib/gamification/streak-restore";
import { getStreak } from "@/lib/gamification/streaks";

export async function GET() {
  return withApiHandler(async () => {
    const user = await requireSessionUser();
    await generateTasksForToday(user);

    const today = localDateInTimezone(user.timezone);
    const todaysTasks = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, user.id), eq(tasks.taskDate, today)))
      .orderBy(tasks.category);

    const [summary] = await db
      .select()
      .from(dailyTaskSummaries)
      .where(and(eq(dailyTaskSummaries.userId, user.id), eq(dailyTaskSummaries.localDate, today)))
      .limit(1);

    const streak = await getStreak(user.id);
    const restoresRemaining = await getRestoresRemaining(user);

    return jsonOk({
      date: today,
      tasks: todaysTasks,
      summary: summary ?? { requiredTotal: 0, requiredCompleted: 0, optionalTotal: 0, optionalCompleted: 0, isFullStreakDay: false, restoredFullStreak: false },
      streak,
      restoresRemainingThisMonth: restoresRemaining,
    });
  });
}
