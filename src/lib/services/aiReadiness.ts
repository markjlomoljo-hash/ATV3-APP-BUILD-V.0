// Real, count-based readiness evaluation for each AI/ML domain. This never
// fabricates a score — it reports actual row counts collected in a trailing
// window and an explicit readiness verdict derived from documented minimum
// thresholds. If a domain lacks a configured/trained model, it always
// reports "not_configured" regardless of data volume.
import { and, count, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { sleepLogs, foodLogs, stressLogs, activityLogs, scanSessions, modelRegistry } from "@/db/schema";

const WINDOW_DAYS = 14;

function windowStartDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - WINDOW_DAYS);
  return d.toISOString().slice(0, 10);
}

export interface DomainReadiness {
  domain: string;
  modelStatus: "not_configured" | "training" | "active" | "deprecated";
  recordCount: number;
  minimumRequired: number;
  readiness: "insufficient_data" | "early_hypothesis_eligible" | "not_configured";
}

async function countSleepLogs(userId: string): Promise<number> {
  const since = windowStartDate();
  const [row] = await db
    .select({ value: count() })
    .from(sleepLogs)
    .where(and(eq(sleepLogs.userId, userId), gte(sleepLogs.logDate, since)));
  return Number(row?.value ?? 0);
}

async function countFoodLogs(userId: string): Promise<number> {
  const since = windowStartDate();
  const [row] = await db
    .select({ value: count() })
    .from(foodLogs)
    .where(and(eq(foodLogs.userId, userId), gte(foodLogs.logDate, since)));
  return Number(row?.value ?? 0);
}

async function countStressLogs(userId: string): Promise<number> {
  const since = windowStartDate();
  const [row] = await db
    .select({ value: count() })
    .from(stressLogs)
    .where(and(eq(stressLogs.userId, userId), gte(stressLogs.logDate, since)));
  return Number(row?.value ?? 0);
}

async function countActivityLogs(userId: string): Promise<number> {
  const since = windowStartDate();
  const [row] = await db
    .select({ value: count() })
    .from(activityLogs)
    .where(and(eq(activityLogs.userId, userId), gte(activityLogs.logDate, since)));
  return Number(row?.value ?? 0);
}

async function countScanSessions(userId: string): Promise<number> {
  const [row] = await db.select({ value: count() }).from(scanSessions).where(eq(scanSessions.userId, userId));
  return Number(row?.value ?? 0);
}

async function getModelStatus(modelKey: string): Promise<DomainReadiness["modelStatus"]> {
  const [row] = await db
    .select({ status: modelRegistry.status })
    .from(modelRegistry)
    .where(eq(modelRegistry.modelKey, modelKey))
    .limit(1);
  return (row?.status as DomainReadiness["modelStatus"]) ?? "not_configured";
}

export async function evaluateReadiness(userId: string): Promise<DomainReadiness[]> {
  const [sleepCount, foodCount, stressCount, activityCount, scanCount, sleepDermStatus, dermDietStatus, triggerGraphStatus, skinTwinStatus] =
    await Promise.all([
      countSleepLogs(userId),
      countFoodLogs(userId),
      countStressLogs(userId),
      countActivityLogs(userId),
      countScanSessions(userId),
      getModelStatus("sleep_derm"),
      getModelStatus("derm_diet"),
      getModelStatus("trigger_graph"),
      getModelStatus("skin_twin"),
    ]);

  const domains: DomainReadiness[] = [
    {
      domain: "sleep_derm",
      modelStatus: sleepDermStatus,
      recordCount: sleepCount,
      minimumRequired: 7,
      readiness:
        sleepDermStatus === "not_configured" ? "not_configured" : sleepCount >= 7 ? "early_hypothesis_eligible" : "insufficient_data",
    },
    {
      domain: "derm_diet",
      modelStatus: dermDietStatus,
      recordCount: foodCount,
      minimumRequired: 10,
      readiness:
        dermDietStatus === "not_configured" ? "not_configured" : foodCount >= 10 ? "early_hypothesis_eligible" : "insufficient_data",
    },
    {
      domain: "trigger_graph",
      modelStatus: triggerGraphStatus,
      recordCount: stressCount + activityCount,
      minimumRequired: 14,
      readiness:
        triggerGraphStatus === "not_configured"
          ? "not_configured"
          : stressCount + activityCount >= 14
            ? "early_hypothesis_eligible"
            : "insufficient_data",
    },
    {
      domain: "skin_twin",
      modelStatus: skinTwinStatus,
      recordCount: scanCount,
      minimumRequired: 2,
      readiness:
        skinTwinStatus === "not_configured" ? "not_configured" : scanCount >= 2 ? "early_hypothesis_eligible" : "insufficient_data",
    },
  ];

  return domains;
}
