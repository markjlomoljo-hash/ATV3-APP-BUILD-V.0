import { randomUUID } from "crypto";
import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  treatmentConflicts,
  treatmentEvents,
  treatmentCheckins,
  treatmentPlanStatusHistory,
  treatmentPlans,
  treatmentReminders,
  treatmentSafetyFlags,
} from "@/db/schema";
import { ApiError } from "@/lib/api-helpers";
import { localDateInTimezone } from "@/lib/dates";
import type { SessionUser } from "@/lib/auth";
import { classifyIngredient, findConflict } from "./ingredient-rules";
import { buildScheduleDays, persistScheduleDays, getScheduleForPlan, type ScheduleStrategy } from "./schedule";
import { evaluatePlanCreationSafety, isSevereCheckin, PROVIDER_CONTACT_GUIDANCE, raiseSafetyFlag } from "./safety";
import { completeTask } from "@/lib/gamification/complete-task";
import { db as dbClient } from "@/db";
import { tasks } from "@/db/schema";

export type CreatePlanInput = {
  name: string;
  brand?: string;
  activeIngredient: string;
  strength?: string;
  vehicleForm?: string;
  route?: "topical" | "oral";
  targetZones?: string[];
  sourceType: "provider_prescribed" | "provider_recommended" | "otc" | "self_selected";
  prescriptionStatus?: "prescription" | "not_prescription";
  providerName?: string;
  providerInstructions?: string;
  baselineTolerance?: Record<string, unknown>;
  scheduleStrategy: ScheduleStrategy;
  escalationRules?: Record<string, unknown>;
  startDate: string;
  reviewDate?: string;
  evidenceSummary?: string;
};

export async function createPlan(user: SessionUser, input: CreatePlanInput) {
  const prescriptionStatus = input.prescriptionStatus ?? "not_prescription";
  let safety: { category: string; notes: string[] };
  try {
    safety = evaluatePlanCreationSafety({
      activeIngredient: input.activeIngredient,
      sourceType: input.sourceType,
      prescriptionStatus,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message.replace("SAFETY_GATE:", "") : "Unsafe plan configuration.";
    throw new ApiError(422, message);
  }

  const initialConfidence = safety.notes.length > 0 ? "needs_review" : "insufficient_data";

  const [plan] = await db
    .insert(treatmentPlans)
    .values({
      id: randomUUID(),
      userId: user.id,
      name: input.name,
      brand: input.brand,
      activeIngredient: input.activeIngredient,
      strength: input.strength,
      vehicleForm: input.vehicleForm,
      route: input.route ?? "topical",
      targetZones: input.targetZones ?? [],
      sourceType: input.sourceType,
      prescriptionStatus,
      providerName: input.providerName,
      providerInstructions: input.providerInstructions,
      baselineTolerance: input.baselineTolerance ?? null,
      scheduleStrategy: input.scheduleStrategy,
      escalationRules: input.escalationRules ?? null,
      startDate: input.startDate,
      reviewDate: input.reviewDate,
      status: "active",
      safetyFlags: safety.notes,
      confidence: initialConfidence,
      evidenceSummary: input.evidenceSummary,
    })
    .returning();

  await db.insert(treatmentPlanStatusHistory).values({ id: randomUUID(), planId: plan.id, status: "active", reason: "Plan created" });

  const days = buildScheduleDays({
    id: plan.id,
    startDate: plan.startDate as unknown as string,
    reviewDate: (plan.reviewDate as unknown as string) ?? null,
    prescriptionStatus: plan.prescriptionStatus,
    scheduleStrategy: input.scheduleStrategy,
    activeIngredient: plan.activeIngredient,
  });
  await persistScheduleDays(plan.id, days);

  for (const note of safety.notes) {
    await raiseSafetyFlag({ planId: plan.id, userId: user.id, flagType: "creation_note", severity: "info", message: note });
  }

  await detectConflictsForPlan(user.id, plan.id);

  return plan;
}

export async function listPlans(userId: string, status?: string) {
  const rows = await db
    .select()
    .from(treatmentPlans)
    .where(status ? and(eq(treatmentPlans.userId, userId), eq(treatmentPlans.status, status)) : eq(treatmentPlans.userId, userId))
    .orderBy(desc(treatmentPlans.createdAt));
  return rows;
}

export async function getPlanOrThrow(userId: string, planId: string) {
  const [plan] = await db.select().from(treatmentPlans).where(and(eq(treatmentPlans.id, planId), eq(treatmentPlans.userId, userId))).limit(1);
  if (!plan) throw new ApiError(404, "Treatment plan not found.");
  return plan;
}

export type UpdatePlanInput = Partial<{
  name: string;
  targetZones: string[];
  providerInstructions: string;
  baselineTolerance: Record<string, unknown>;
  reviewDate: string;
  evidenceSummary: string;
  scheduleStrategy: ScheduleStrategy;
  escalationRules: Record<string, unknown>;
  providerConfirmed: boolean;
}>;

const PROVIDER_GATED_FIELDS: Array<keyof UpdatePlanInput> = ["scheduleStrategy", "escalationRules"];

export async function updatePlan(user: SessionUser, planId: string, input: UpdatePlanInput) {
  const plan = await getPlanOrThrow(user.id, planId);

  const touchesGatedField = PROVIDER_GATED_FIELDS.some((f) => input[f] !== undefined);
  if (plan.prescriptionStatus === "prescription" && touchesGatedField && !input.providerConfirmed) {
    throw new ApiError(422, "Schedule or escalation changes on a prescription plan require provider confirmation (set providerConfirmed: true after checking with your provider).");
  }

  const { providerConfirmed: _pc, ...rest } = input;
  void _pc;

  const [updated] = await db
    .update(treatmentPlans)
    .set({ ...rest, updatedAt: new Date() })
    .where(eq(treatmentPlans.id, planId))
    .returning();

  if (input.scheduleStrategy) {
    const days = buildScheduleDays({
      id: updated.id,
      startDate: updated.startDate as unknown as string,
      reviewDate: (updated.reviewDate as unknown as string) ?? null,
      prescriptionStatus: updated.prescriptionStatus,
      scheduleStrategy: input.scheduleStrategy,
      activeIngredient: updated.activeIngredient,
    });
    await persistScheduleDays(updated.id, days);
  }

  return updated;
}

export async function changePlanStatus(user: SessionUser, planId: string, action: "pause" | "resume" | "archive", reason?: string) {
  const plan = await getPlanOrThrow(user.id, planId);
  const nextStatus = action === "pause" ? "paused" : action === "resume" ? "active" : "archived";

  if (plan.status === nextStatus) {
    throw new ApiError(409, `Plan is already ${nextStatus}.`);
  }

  const [updated] = await db.update(treatmentPlans).set({ status: nextStatus, updatedAt: new Date() }).where(eq(treatmentPlans.id, planId)).returning();
  await db.insert(treatmentPlanStatusHistory).values({ id: randomUUID(), planId, status: nextStatus, reason: reason ?? action });
  return updated;
}

export async function getPlanHistory(userId: string) {
  return db
    .select()
    .from(treatmentPlans)
    .where(and(eq(treatmentPlans.userId, userId), ne(treatmentPlans.status, "active")))
    .orderBy(desc(treatmentPlans.updatedAt));
}

export type CheckinInput = {
  clientCheckinId: string;
  checkinDate: string;
  usageStatus: "used" | "skipped" | "delayed" | "partial" | "stopped";
  irritationLevel?: "none" | "mild" | "moderate" | "severe";
  barrierSymptoms?: string[];
  acneChange?: "better" | "same" | "worse" | "unsure";
  sideEffects?: string[];
  sunscreenUsed?: boolean;
  conflictingActives?: string[];
  toleranceScore?: number;
  notes?: string;
};

export async function addCheckin(user: SessionUser, planId: string, input: CheckinInput) {
  const plan = await getPlanOrThrow(user.id, planId);

  const existingByClientId = await db.select().from(treatmentCheckins).where(eq(treatmentCheckins.clientCheckinId, input.clientCheckinId)).limit(1);
  if (existingByClientId[0]) {
    return { checkin: existingByClientId[0], duplicate: true, safety: null as null | { severe: boolean; reasons: string[] } };
  }

  const irritationLevel = input.irritationLevel ?? "none";
  const barrierSymptoms = input.barrierSymptoms ?? [];
  const sideEffects = input.sideEffects ?? [];

  const [checkin] = await db
    .insert(treatmentCheckins)
    .values({
      id: randomUUID(),
      planId,
      userId: user.id,
      checkinDate: input.checkinDate,
      clientCheckinId: input.clientCheckinId,
      usageStatus: input.usageStatus,
      irritationLevel,
      barrierSymptoms,
      acneChange: input.acneChange,
      sideEffects,
      sunscreenUsed: input.sunscreenUsed,
      conflictingActives: input.conflictingActives ?? [],
      toleranceScore: input.toleranceScore,
      notes: input.notes,
    })
    .onConflictDoNothing({ target: [treatmentCheckins.planId, treatmentCheckins.checkinDate] })
    .returning();

  if (!checkin) {
    const [existingForDate] = await db
      .select()
      .from(treatmentCheckins)
      .where(and(eq(treatmentCheckins.planId, planId), eq(treatmentCheckins.checkinDate, input.checkinDate)))
      .limit(1);
    return { checkin: existingForDate, duplicate: true, safety: null };
  }

  const severity = isSevereCheckin({ irritationLevel, barrierSymptoms, sideEffects });
  if (severity.severe) {
    await raiseSafetyFlag({
      planId,
      userId: user.id,
      flagType: "severe_symptom",
      severity: "severe",
      message: `${severity.reasons.join(" ")} ${PROVIDER_CONTACT_GUIDANCE}`,
      requiresProviderContact: true,
    });
    await db.update(treatmentPlans).set({ confidence: "needs_provider_review", updatedAt: new Date() }).where(eq(treatmentPlans.id, planId));
  }

  // Auto-complete the matching daily task, if one exists, using the same
  // points/streak pipeline as any other task (keeps the ledger consistent
  // and prevents a duplicate "treatment_checkin" task from lingering).
  const [matchingTask] = await dbClient
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, user.id), eq(tasks.taskDate, input.checkinDate), eq(tasks.dedupeKey, `treatment_checkin:${planId}`)))
    .limit(1);
  if (matchingTask && matchingTask.status === "pending") {
    await completeTask(user, matchingTask.id, { clientCompletionId: `checkin:${input.clientCheckinId}`, completedAtLocalDate: input.checkinDate });
  }

  return { checkin, duplicate: false, safety: severity.severe ? severity : null, plan };
}

export type TreatmentEventInput = {
  clientEventId: string;
  eventDate: string;
  eventType: "use" | "skip" | "delay" | "partial" | "stop";
  notes?: string;
};

export async function addEvent(user: SessionUser, planId: string, input: TreatmentEventInput) {
  await getPlanOrThrow(user.id, planId);
  const existing = await db.select().from(treatmentEvents).where(eq(treatmentEvents.clientEventId, input.clientEventId)).limit(1);
  if (existing[0]) return { event: existing[0], duplicate: true };

  const [event] = await db
    .insert(treatmentEvents)
    .values({
      id: randomUUID(),
      planId,
      userId: user.id,
      eventDate: input.eventDate,
      eventType: input.eventType,
      clientEventId: input.clientEventId,
      notes: input.notes,
    })
    .returning();
  return { event, duplicate: false };
}

export async function getSafetyForPlan(userId: string, planId: string) {
  await getPlanOrThrow(userId, planId);
  return db.select().from(treatmentSafetyFlags).where(eq(treatmentSafetyFlags.planId, planId)).orderBy(desc(treatmentSafetyFlags.createdAt));
}

export async function addReminder(user: SessionUser, planId: string, timeOfDay: string, frequency = "daily") {
  await getPlanOrThrow(user.id, planId);
  const [reminder] = await db.insert(treatmentReminders).values({ id: randomUUID(), planId, userId: user.id, timeOfDay, frequency }).returning();
  return reminder;
}

export async function detectConflictsForPlan(userId: string, planId: string) {
  const plan = await getPlanOrThrow(userId, planId);
  const others = await db
    .select()
    .from(treatmentPlans)
    .where(and(eq(treatmentPlans.userId, userId), eq(treatmentPlans.status, "active"), ne(treatmentPlans.id, planId)));

  const catA = classifyIngredient(plan.activeIngredient);
  for (const other of others) {
    const catB = classifyIngredient(other.activeIngredient);
    const rule = findConflict(catA, catB);
    if (!rule) continue;

    await db
      .insert(treatmentConflicts)
      .values({ id: randomUUID(), planId: plan.id, conflictingPlanId: other.id, conflictType: rule.type, description: rule.description })
      .onConflictDoNothing();
    await raiseSafetyFlag({
      planId: plan.id,
      userId,
      flagType: "conflict",
      severity: rule.type === "stewardship" ? "warning" : "warning",
      message: `Possible interaction with "${other.name}": ${rule.description}`,
    });
  }
}

export async function getScheduleDays(userId: string, planId: string) {
  await getPlanOrThrow(userId, planId);
  return getScheduleForPlan(planId);
}

export function localToday(user: SessionUser) {
  return localDateInTimezone(user.timezone);
}
