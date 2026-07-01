import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { treatmentScheduleDays } from "@/db/schema";
import { addDaysToLocalDate } from "@/lib/dates";
import { classifyIngredient } from "./ingredient-rules";

export type ScheduleStrategy = {
  frequency: "daily" | "every_other_day" | "twice_daily" | "weekly";
  weeklyDays?: number[]; // 0=Sun..6=Sat, only used when frequency === 'weekly'
  rampWeeks?: number; // optional gentle-start ramp (every-other-day) before base frequency
  horizonDays?: number; // how many days ahead to generate (default 30)
};

function weekdayOf(localDate: string): number {
  const [y, m, d] = localDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Rule-based (not ML) schedule generator. Deterministic and explainable:
 * every day type is derived directly from the user-entered strategy, the
 * plan's start/review dates, and whether the plan is provider-prescribed. */
export function buildScheduleDays(plan: {
  id: string;
  startDate: string;
  reviewDate: string | null;
  prescriptionStatus: string;
  scheduleStrategy: ScheduleStrategy;
  activeIngredient: string;
}) {
  const strategy = plan.scheduleStrategy;
  const horizon = strategy.horizonDays ?? 30;
  const category = classifyIngredient(plan.activeIngredient);
  const rampDays = category === "isotretinoin" ? 0 : (strategy.rampWeeks ?? 0) * 7; // isotretinoin: no auto-ramp, provider-directed only

  const days: Array<{ scheduledDate: string; dayType: string; instructions: string | null }> = [];

  for (let i = 0; i < horizon; i++) {
    const date = addDaysToLocalDate(plan.startDate, i);
    let dayType: "active" | "rest" = "rest";
    let instructions: string | null = null;

    const inRamp = i < rampDays;
    const effectiveFrequency = inRamp ? "every_other_day" : strategy.frequency;

    if (effectiveFrequency === "daily" || effectiveFrequency === "twice_daily") {
      dayType = "active";
      instructions = effectiveFrequency === "twice_daily" ? "Use in the morning and evening as directed." : "Use as directed today.";
    } else if (effectiveFrequency === "every_other_day") {
      dayType = i % 2 === 0 ? "active" : "rest";
      instructions = dayType === "active" ? "Active night — apply as directed." : "Rest night — skip this active to support barrier recovery.";
    } else if (effectiveFrequency === "weekly") {
      const isActiveDay = (strategy.weeklyDays ?? []).includes(weekdayOf(date));
      dayType = isActiveDay ? "active" : "rest";
    }

    if (plan.reviewDate && date === plan.reviewDate) {
      dayType = plan.prescriptionStatus === "prescription" ? ("provider_check" as never) : ("review" as never);
      instructions = plan.prescriptionStatus === "prescription" ? "Provider review date — confirm before continuing or changing this plan." : "Review date — check in on progress and tolerance.";
    }

    days.push({ scheduledDate: date, dayType, instructions });
  }

  return days;
}

export async function persistScheduleDays(
  planId: string,
  days: Array<{ scheduledDate: string; dayType: string; instructions: string | null }>,
) {
  for (const day of days) {
    await db
      .insert(treatmentScheduleDays)
      .values({ id: randomUUID(), planId, scheduledDate: day.scheduledDate, dayType: day.dayType, instructions: day.instructions })
      .onConflictDoNothing({ target: [treatmentScheduleDays.planId, treatmentScheduleDays.scheduledDate] });
  }
}

export async function getScheduleForPlan(planId: string) {
  return db.select().from(treatmentScheduleDays).where(eq(treatmentScheduleDays.planId, planId));
}
