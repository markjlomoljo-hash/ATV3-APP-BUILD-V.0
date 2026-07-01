import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { foodLogs } from "@/db/schema";
import { requireSessionUser } from "@/lib/auth";
import { jsonOk, withApiHandler } from "@/lib/api-helpers";
import { foodLogSchema } from "@/lib/validation";

// Minimal DermDiet integration stand-in. Multiple entries per day are
// allowed (meals + snacks); nothing is deduplicated away because each real
// meal is its own event.
export async function POST(req: Request) {
  return withApiHandler(async () => {
    const user = await requireSessionUser();
    const body = foodLogSchema.parse(await req.json());
    const [row] = await db
      .insert(foodLogs)
      .values({ id: randomUUID(), userId: user.id, ...body })
      .returning();
    return jsonOk({ log: row });
  });
}

export async function GET(req: Request) {
  return withApiHandler(async () => {
    const user = await requireSessionUser();
    const url = new URL(req.url);
    const logDate = url.searchParams.get("date");
    const rows = await db.select().from(foodLogs).where(eq(foodLogs.userId, user.id));
    return jsonOk({ logs: logDate ? rows.filter((r) => (r.logDate as unknown as string) === logDate) : rows });
  });
}
