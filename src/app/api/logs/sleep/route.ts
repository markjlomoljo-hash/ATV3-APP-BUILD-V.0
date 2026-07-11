import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { sleepLogs } from "@/db/schema";
import { requireSessionUser } from "@/lib/auth";
import { jsonOk, withApiHandler } from "@/lib/api-helpers";
import { sleepLogSchema } from "@/lib/validation";

// Minimal SleepDerm integration stand-in: real persistence, one row per
// user/day (merge-on-write, never duplicated). Full SleepDerm analytics are
// out of scope for Phase 6 — this exists so Task Board generation has real
// data to check against.
export async function POST(req: Request) {
  return withApiHandler(async () => {
    const user = await requireSessionUser();
    const body = sleepLogSchema.parse(await req.json());

    const [row] = await db
      .insert(sleepLogs)
      .values({ id: randomUUID(), userId: user.id, ...body })
      .onConflictDoUpdate({
        target: [sleepLogs.userId, sleepLogs.logDate],
        set: { sleepTime: body.sleepTime, wakeTime: body.wakeTime, quality: body.quality, disturbances: body.disturbances, notes: body.notes },
      })
      .returning();

    return jsonOk({ log: row });
  });
}

export async function GET(req: Request) {
  return withApiHandler(async () => {
    const user = await requireSessionUser();
    const url = new URL(req.url);
    const logDate = url.searchParams.get("date");
    const rows = await db
      .select()
      .from(sleepLogs)
      .where(logDate ? and(eq(sleepLogs.userId, user.id), eq(sleepLogs.logDate, logDate)) : eq(sleepLogs.userId, user.id));
    return jsonOk({ logs: rows });
  });
}
