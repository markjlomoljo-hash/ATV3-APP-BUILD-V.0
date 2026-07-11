import { eq } from "drizzle-orm";
import { db } from "@/db";
import { petState } from "@/db/schema";
import { requireSessionUser } from "@/lib/auth";
import { jsonOk, withApiHandler } from "@/lib/api-helpers";
import { syncProgress } from "@/lib/gamification/progress";
import { PET_STAGES } from "@/lib/gamification/seed-data";

export async function GET() {
  return withApiHandler(async () => {
    const user = await requireSessionUser();
    await syncProgress(user.id);
    const [pet] = await db.select().from(petState).where(eq(petState.userId, user.id)).limit(1);
    const stageDefinition = PET_STAGES.find((s) => s.code === pet?.stageCode) ?? PET_STAGES[0];
    const nextStage = PET_STAGES[(pet?.stageIndex ?? 0) + 1] ?? null;

    return jsonOk({
      pet: pet ?? { stageIndex: 0, stageCode: "seed_signal", growthScore: 0 },
      stageName: stageDefinition.name,
      nextStage: nextStage ? { code: nextStage.code, name: nextStage.name, growthNeeded: Math.max(0, nextStage.minGrowth - (pet?.growthScore ?? 0)) } : null,
    });
  });
}
