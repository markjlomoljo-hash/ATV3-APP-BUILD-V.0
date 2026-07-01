import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { treatmentCheckins, treatmentPlans } from "@/db/schema";
import { TreatmentSummary } from "@/types/profile";

export async function computeTreatmentSummary(userId: string): Promise<TreatmentSummary> {
  const plans = await db.select().from(treatmentPlans).where(eq(treatmentPlans.userId, userId));
  const checkins = await db
    .select()
    .from(treatmentCheckins)
    .where(eq(treatmentCheckins.userId, userId))
    .orderBy(desc(treatmentCheckins.checkinDate));

  if (plans.length === 0 && checkins.length === 0) {
    return {
      activePlans: 0,
      archivedPlans: 0,
      lastCheckinDate: null,
      adherenceRatePct: null,
      insufficientData: true,
    };
  }

  const activePlans = plans.filter((p) => p.status === "active").length;
  const archivedPlans = plans.filter((p) => p.status === "archived").length;

  const usedOrPartial = checkins.filter((c) => c.status === "used" || c.status === "partial").length;
  const adherenceRatePct =
    checkins.length > 0 ? Math.round((usedOrPartial / checkins.length) * 1000) / 10 : null;

  return {
    activePlans,
    archivedPlans,
    lastCheckinDate: checkins[0]?.checkinDate ?? null,
    adherenceRatePct,
    insufficientData: checkins.length === 0,
  };
}
