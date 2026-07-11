import { randomUUID } from "crypto";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  consentReviews,
  dailyTaskSummaries,
  faceScans,
  foodLogs,
  sleepLogs,
  taskTemplates,
  tasks,
  treatmentPlans,
  treatmentScheduleDays,
  treatmentCheckins,
} from "@/db/schema";
import { addDaysToLocalDate, daysBetween, localDateInTimezone } from "@/lib/dates";
import { ensureCatalogSeeded } from "./ensure-seed";
import type { SessionUser } from "@/lib/auth";

const SCAN_FRESHNESS_DAYS = 7;

async function templateMap() {
  const rows = await db.select().from(taskTemplates);
  return new Map(rows.map((r) => [r.id, r]));
}

async function insertTaskIfMissing(params: {
  userId: string;
  taskDate: string;
  dedupeKey: string;
  templateId: string;
  templates: Map<string, { title: string; description: string; reasonTemplate: string; basePoints: number; requiredForStreak: boolean; category: string }>;
  overrides?: Partial<{ title: string; description: string; reason: string; points: number; relatedPlanId: string; requiredForStreak: boolean }>;
}) {
  const tpl = params.templates.get(params.templateId);
  if (!tpl) return;
  await db
    .insert(tasks)
    .values({
      id: randomUUID(),
      userId: params.userId,
      templateId: params.templateId,
      taskDate: params.taskDate,
      dedupeKey: params.dedupeKey,
      category: tpl.category,
      title: params.overrides?.title ?? tpl.title,
      description: params.overrides?.description ?? tpl.description,
      reason: params.overrides?.reason ?? tpl.reasonTemplate,
      points: params.overrides?.points ?? tpl.basePoints,
      requiredForStreak: params.overrides?.requiredForStreak ?? tpl.requiredForStreak,
      sourceModule: "system",
      relatedPlanId: params.overrides?.relatedPlanId,
      status: "pending",
    })
    .onConflictDoNothing({ target: [tasks.userId, tasks.taskDate, tasks.dedupeKey] });
}

/** Generates (idempotently) all tasks that should exist for the user's
 * current local day, based only on real persisted records. Safe to call on
 * every `/api/tasks/today` request. */
export async function generateTasksForToday(user: SessionUser) {
  await ensureCatalogSeeded();
  const templates = await templateMap();
  const today = localDateInTimezone(user.timezone);
  const yesterday = addDaysToLocalDate(today, -1);

  // 1. Sleep log
  const sleepToday = await db
    .select({ id: sleepLogs.id })
    .from(sleepLogs)
    .where(and(eq(sleepLogs.userId, user.id), eq(sleepLogs.logDate, today)))
    .limit(1);
  if (sleepToday.length === 0) {
    await insertTaskIfMissing({ userId: user.id, taskDate: today, dedupeKey: "log_sleep", templateId: "log_sleep", templates });
  }

  // 2. Meals vs baseline
  const foodCountRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(foodLogs)
    .where(and(eq(foodLogs.userId, user.id), eq(foodLogs.logDate, today)));
  const foodCount = foodCountRows[0]?.count ?? 0;
  if (foodCount < user.mealFrequencyBaseline) {
    await insertTaskIfMissing({
      userId: user.id,
      taskDate: today,
      dedupeKey: "log_meals",
      templateId: "log_meals",
      templates,
      overrides: {
        description: `You've logged ${foodCount} of your usual ${user.mealFrequencyBaseline} meals today.`,
      },
    });
  }

  // 3. Scan freshness + annotation
  const latestScan = await db
    .select()
    .from(faceScans)
    .where(eq(faceScans.userId, user.id))
    .orderBy(desc(faceScans.scanDate))
    .limit(1);
  const scan = latestScan[0];
  if (!scan || daysBetween(scan.scanDate as unknown as string, today) >= SCAN_FRESHNESS_DAYS) {
    await insertTaskIfMissing({ userId: user.id, taskDate: today, dedupeKey: "scan_freshness", templateId: "scan_freshness", templates });
  } else if (!scan.annotationComplete) {
    await insertTaskIfMissing({
      userId: user.id,
      taskDate: today,
      dedupeKey: `annotate_scan:${scan.id}`,
      templateId: "annotate_scan",
      templates,
    });
  }

  // 4. Consent review (only if never reviewed)
  const consentRows = await db.select({ id: consentReviews.id }).from(consentReviews).where(eq(consentReviews.userId, user.id)).limit(1);
  if (consentRows.length === 0) {
    await insertTaskIfMissing({ userId: user.id, taskDate: today, dedupeKey: "consent_review", templateId: "consent_review", templates });
  }

  // 5. Backfill for yesterday if it was partial/missed
  const yesterdaySummary = await db
    .select()
    .from(dailyTaskSummaries)
    .where(and(eq(dailyTaskSummaries.userId, user.id), eq(dailyTaskSummaries.localDate, yesterday)))
    .limit(1);
  const ySummary = yesterdaySummary[0];
  if (ySummary && ySummary.requiredTotal > 0 && ySummary.requiredCompleted < ySummary.requiredTotal && !ySummary.restoredFullStreak) {
    await insertTaskIfMissing({
      userId: user.id,
      taskDate: today,
      dedupeKey: `backfill:${yesterday}`,
      templateId: "backfill_log",
      templates,
      overrides: {
        description: `You missed ${ySummary.requiredTotal - ySummary.requiredCompleted} required item(s) on ${yesterday}. Backfill only if you remember it accurately.`,
      },
    });
  }

  // 6. Treatment plan tasks (active plans only)
  const activePlans = await db.select().from(treatmentPlans).where(and(eq(treatmentPlans.userId, user.id), eq(treatmentPlans.status, "active")));
  for (const plan of activePlans) {
    const scheduleDay = await db
      .select()
      .from(treatmentScheduleDays)
      .where(and(eq(treatmentScheduleDays.planId, plan.id), eq(treatmentScheduleDays.scheduledDate, today)))
      .limit(1);
    const day = scheduleDay[0];
    if (!day) continue;

    if (day.dayType === "active" || day.dayType === "rest") {
      const existingCheckin = await db
        .select({ id: treatmentCheckins.id })
        .from(treatmentCheckins)
        .where(and(eq(treatmentCheckins.planId, plan.id), eq(treatmentCheckins.checkinDate, today)))
        .limit(1);
      if (existingCheckin.length === 0) {
        await insertTaskIfMissing({
          userId: user.id,
          taskDate: today,
          dedupeKey: `treatment_checkin:${plan.id}`,
          templateId: "treatment_checkin",
          templates,
          overrides: {
            title: `Check in: ${plan.name}`,
            description: day.instructions ?? `Log today's use for ${plan.name}.`,
            relatedPlanId: plan.id,
          },
        });
      }
    }

    if (day.dayType === "provider_check") {
      await insertTaskIfMissing({
        userId: user.id,
        taskDate: today,
        dedupeKey: `treatment_provider_review:${plan.id}`,
        templateId: "treatment_provider_review",
        templates,
        overrides: {
          title: `Provider check-in: ${plan.name}`,
          relatedPlanId: plan.id,
        },
      });
    }
  }

  await recomputeDailySummary(user.id, today);
  await recomputeDailySummary(user.id, yesterday);
}

/** Recomputes the aggregate daily summary row from real task rows only. */
export async function recomputeDailySummary(userId: string, localDate: string) {
  const rows = await db.select().from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.taskDate, localDate)));
  const required = rows.filter((r) => r.requiredForStreak);
  const optional = rows.filter((r) => !r.requiredForStreak);
  const requiredCompleted = required.filter((r) => r.status === "completed").length;
  const optionalCompleted = optional.filter((r) => r.status === "completed").length;
  const isFull = required.length === requiredCompleted;

  await db
    .insert(dailyTaskSummaries)
    .values({
      id: randomUUID(),
      userId,
      localDate,
      requiredTotal: required.length,
      requiredCompleted,
      optionalTotal: optional.length,
      optionalCompleted,
      isFullStreakDay: isFull,
    })
    .onConflictDoUpdate({
      target: [dailyTaskSummaries.userId, dailyTaskSummaries.localDate],
      set: {
        requiredTotal: required.length,
        requiredCompleted,
        optionalTotal: optional.length,
        optionalCompleted,
        isFullStreakDay: isFull,
        updatedAt: new Date(),
      },
    });
}

export async function getTaskHistory(userId: string, sinceDate: string) {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, userId), gte(tasks.taskDate, sinceDate)))
    .orderBy(desc(tasks.taskDate));
}
