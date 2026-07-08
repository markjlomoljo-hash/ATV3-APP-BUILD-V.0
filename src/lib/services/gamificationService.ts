import { eq } from "drizzle-orm";
import { db } from "@/db";
import { streaks } from "@/db/schema";
import { toDateOnly } from "@/lib/dates";

/**
 * Updates a user's streak based on today's real activity. Derived purely
 * from stored `lastActiveDate` — never fabricated or estimated.
 */
export async function touchStreak(userId: string): Promise<typeof streaks.$inferSelect> {
  const today = toDateOnly();
  const [existing] = await db.select().from(streaks).where(eq(streaks.userId, userId)).limit(1);

  if (!existing) {
    const [row] = await db
      .insert(streaks)
      .values({ userId, currentStreakDays: 1, longestStreakDays: 1, lastActiveDate: new Date() })
      .returning();
    return row;
  }

  const lastActive = existing.lastActiveDate ? toDateOnly(existing.lastActiveDate) : null;
  if (lastActive === today) {
    return existing; // already counted today
  }

  const yesterday = toDateOnly(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const nextStreak = lastActive === yesterday ? existing.currentStreakDays + 1 : 1;

  const [row] = await db
    .update(streaks)
    .set({
      currentStreakDays: nextStreak,
      longestStreakDays: Math.max(nextStreak, existing.longestStreakDays),
      lastActiveDate: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(streaks.userId, userId))
    .returning();
  return row;
}
