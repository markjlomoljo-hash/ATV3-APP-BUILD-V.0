import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { ranks, userRankHistory } from "@/db/schema";
import { requireSessionUser } from "@/lib/auth";
import { jsonOk, withApiHandler } from "@/lib/api-helpers";
import { ensureCatalogSeeded } from "@/lib/gamification/ensure-seed";

export async function GET() {
  return withApiHandler(async () => {
    const user = await requireSessionUser();
    await ensureCatalogSeeded();
    const all = await db.select().from(ranks).orderBy(ranks.sortOrder);
    const [current] = await db.select().from(userRankHistory).where(eq(userRankHistory.userId, user.id)).orderBy(desc(userRankHistory.achievedAt)).limit(1);

    return jsonOk({ ranks: all, currentRankId: current?.rankId ?? all[0]?.id ?? null });
  });
}
