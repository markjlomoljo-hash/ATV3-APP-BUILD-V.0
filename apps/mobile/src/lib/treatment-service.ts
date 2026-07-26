/**
 * Treatment Protocol Engine — plans, plan-aware check-ins, adherence.
 *
 * Write boundary (verified against live grants 2026-07-26):
 * - `treatment_plans` and `treatment_checkins` are SELECT-only for
 *   authenticated clients (RLS owner reads; treatment_checkins compares
 *   auth.uid()::text). All writes go through the backend contracts:
 *   POST /api/treatments/plans and POST /api/treatments/checkins.
 * - `treatment_checkins.plan_id` is NOT NULL on the live schema; the
 *   check-in contract validates plan ownership and writes plan_id
 *   server-side, which is how mobile check-ins get a real plan_id.
 * - The plans contract enforces the safety gate: only plans attested as
 *   provider-directed are accepted (422 provider_directed_treatment_required
 *   otherwise). Mobile mirrors the web UI: the attestation is an explicit
 *   user checkbox, never set silently.
 * - There is no plan-edit contract (no PATCH route, no client UPDATE grant),
 *   so editing is honestly unavailable; the UI says so.
 *
 * Pure domain logic (plan schedule parsing, the deterministic adherence
 * engine mirror, input derivation) lives in treatment-protocol.ts and is
 * re-exported here.
 */

import { supabase } from "./supabase";
import { apiMutation, createMutationOperation } from "./api";
import { createOfflineOperation } from "../../../../packages/ml-local-runtime/src/offline-queue-contract";
import { randomUUID } from "expo-crypto";
import { openExpoOfflineOperationStore } from "./ml-offline-store";
import { isNetworkAvailable, isNetworkError } from "./network";
import type { TreatmentCheckin } from "./daily-logs-service";
import {
  parsePlanSchedule,
  type PlanCheckinStatus,
  type TreatmentPlan,
  type TreatmentPlanStep,
} from "./treatment-protocol";

export * from "./treatment-protocol";

// ─── Plan reads (RLS-scoped SELECT) ──────────────────────────────────────────

export async function fetchTreatmentPlans(userId: string): Promise<TreatmentPlan[]> {
  const { data, error } = await supabase
    .from("treatment_plans")
    .select(
      "id, user_id, title, description, schedule, status, started_at, ended_at, created_at, updated_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(`treatment_plans_fetch_failed: ${error.message}`);

  return (data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    return {
      id: String(record.id),
      user_id: String(record.user_id),
      title: String(record.title),
      description: (record.description as string | null) ?? null,
      status: String(record.status),
      started_at: (record.started_at as string | null) ?? null,
      ended_at: (record.ended_at as string | null) ?? null,
      created_at: String(record.created_at),
      updated_at: String(record.updated_at),
      ...parsePlanSchedule(record.schedule),
    };
  });
}

// ─── Plan creation (backend contract) ────────────────────────────────────────

export interface CreatePlanInput {
  name: string;
  activeIngredient?: string;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD */
  reviewDate?: string;
  instructions?: string;
  steps: TreatmentPlanStep[];
  /**
   * Explicit user attestation that the plan was supplied or reviewed by a
   * healthcare professional. The server rejects plans without it
   * (provider_directed_treatment_required) — callers must pass the user's
   * real checkbox state, never a hardcoded true.
   */
  providerDirected: boolean;
}

interface CreatePlanResponse {
  ok: boolean;
  plan?: { id: string; title: string; status: string };
}

/**
 * Creates a plan via POST /api/treatments/plans. Throws honest error codes
 * from the API layer (api_not_configured, auth_required,
 * provider_directed_treatment_required, database_unavailable, ...). Plan
 * creation is not queued offline: the server assigns the plan id that every
 * later check-in depends on, so a fabricated local plan would be a lie.
 */
export async function createTreatmentPlan(
  input: CreatePlanInput
): Promise<NonNullable<CreatePlanResponse["plan"]>> {
  const operation = createMutationOperation({
    name: input.name.trim(),
    ...(input.activeIngredient?.trim()
      ? { activeIngredient: input.activeIngredient.trim() }
      : {}),
    startDate: input.startDate,
    ...(input.reviewDate ? { reviewDate: input.reviewDate } : {}),
    ...(input.instructions?.trim()
      ? { instructions: input.instructions.trim().slice(0, 2000) }
      : {}),
    providerDirected: input.providerDirected,
    steps: input.steps.map((step) => ({
      name: step.name.trim().slice(0, 200),
      timeOfDay: step.timeOfDay,
    })),
  });
  const response = await apiMutation<CreatePlanResponse, unknown>(
    "POST",
    "/api/treatments/plans",
    operation
  );
  if (!response.ok || !response.plan?.id) {
    throw new Error("treatment_plan_create_failed: malformed_response");
  }
  return response.plan;
}

// ─── Plan-aware check-ins (backend contract, offline-queued) ─────────────────

export interface PlanCheckinInput {
  planId: string;
  status: PlanCheckinStatus;
  irritation?: number; // 0-10
  notes?: string;
}

interface CreateCheckinResponse {
  ok: boolean;
  checkin?: {
    id: string;
    planId: string;
    checkinDate: string;
    status: string;
    irritation: number | null;
    notes: string | null;
    createdAt: string;
  };
}

export type CheckinWriteOutcome =
  | { status: "saved"; checkin: NonNullable<CreateCheckinResponse["checkin"]> }
  | { status: "queued_offline" };

function todayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Records a check-in against a real plan via POST /api/treatments/checkins.
 * The server validates plan ownership and persists plan_id — this is the
 * path that ends the plan_id-always-null era on mobile.
 *
 * Offline behavior: the request is stored in the encrypted offline operation
 * store (same store the ML job queue uses) and replayed by
 * replayQueuedMlJobs on app foreground, reusing its idempotency-key replay
 * contract. Honest holds (api_not_configured / auth_required) throw instead
 * of queueing — queueing them would fake a save that has no configured
 * destination.
 */
export async function createPlanCheckin(
  input: PlanCheckinInput
): Promise<CheckinWriteOutcome> {
  const payload = {
    planId: input.planId,
    checkinDate: todayDateString(),
    status: input.status,
    irritation: input.irritation ?? null,
    ...(input.notes?.trim() ? { notes: input.notes.trim().slice(0, 2000) } : {}),
  };

  const queueOffline = async (): Promise<CheckinWriteOutcome> => {
    const store = await openExpoOfflineOperationStore();
    await store.put(
      createOfflineOperation(
        {
          method: "POST",
          route: "/api/treatments/checkins",
          validatedPayload: payload,
          payloadSchemaVersion: "1",
        },
        randomUUID
      )
    );
    return { status: "queued_offline" };
  };

  if (!(await isNetworkAvailable())) return queueOffline();

  try {
    const response = await apiMutation<CreateCheckinResponse, unknown>(
      "POST",
      "/api/treatments/checkins",
      createMutationOperation(payload)
    );
    if (!response.ok || !response.checkin?.id) {
      throw new Error("treatment_checkin_create_failed: malformed_response");
    }
    return { status: "saved", checkin: response.checkin };
  } catch (error) {
    if (isNetworkError(error)) return queueOffline();
    throw error;
  }
}

/** RLS-scoped read of check-ins, optionally narrowed to one plan. */
export async function fetchPlanCheckins(
  userId: string,
  options: { planId?: string; days?: number } = {}
): Promise<TreatmentCheckin[]> {
  const days = options.days ?? 30;
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split("T")[0];

  let query = supabase
    .from("treatment_checkins")
    .select("*")
    .eq("user_id", userId)
    .gte("checkin_date", sinceStr)
    .order("checkin_date", { ascending: false })
    .limit(100);
  if (options.planId) query = query.eq("plan_id", options.planId);

  const { data, error } = await query;
  if (error) throw new Error(`treatment_checkins_fetch_failed: ${error.message}`);
  return (data ?? []) as TreatmentCheckin[];
}
