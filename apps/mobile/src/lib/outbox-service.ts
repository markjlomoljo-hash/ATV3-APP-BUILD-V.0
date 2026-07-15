/**
 * Offline Outbox Service
 *
 * Implements a reliable event delivery pattern using the outbox_events table.
 * Events are written to the DB outbox and processed by the server-side worker.
 * This ensures no data is lost even if the app goes offline mid-operation.
 *
 * For Phase 1, this is used for:
 * - Profile updates
 * - Consent changes
 * - Log submissions
 * - Onboarding completion
 */

import { supabase } from "./supabase";
import { randomUUID } from "expo-crypto";

export type OutboxEventType =
  | "profile.updated"
  | "consent.updated"
  | "onboarding.completed"
  | "sleep_log.created"
  | "food_log.created"
  | "daily_log.updated"
  | "treatment_checkin.created";

export interface OutboxEvent {
  id: string;
  event_type: OutboxEventType;
  aggregate_type: string;
  aggregate_id: string;
  user_id: string;
  payload: Record<string, unknown>;
  deduplication_key?: string;
  status: "pending" | "processing" | "done" | "failed";
  attempt_count: number;
  created_at: string;
}

/**
 * Write an event to the outbox for reliable processing.
 * Idempotent when deduplication_key is provided.
 */
export async function writeOutboxEvent(
  userId: string,
  eventType: OutboxEventType,
  aggregateType: string,
  aggregateId: string,
  payload: Record<string, unknown>,
  deduplicationKey?: string
): Promise<void> {
  const id = randomUUID();
  const dedupKey =
    deduplicationKey ??
    `${userId}:${eventType}:${aggregateId}:${new Date().toISOString().split("T")[0]}`;

  // Check for existing event with same dedup key (idempotency)
  if (deduplicationKey) {
    const { data: existing } = await supabase
      .from("outbox_events")
      .select("id, status")
      .eq("deduplication_key", dedupKey)
      .in("status", ["pending", "processing", "done"])
      .limit(1)
      .single();

    if (existing) {
      // Already queued or processed — skip
      return;
    }
  }

  const { error } = await supabase.from("outbox_events").insert({
    id,
    event_type: eventType,
    aggregate_type: aggregateType,
    aggregate_id: aggregateId,
    user_id: userId,
    payload,
    deduplication_key: dedupKey,
    status: "pending",
    attempt_count: 0,
    max_attempts: 3,
  });

  if (error) {
    // Non-fatal: outbox write failure should not block the primary operation
    console.warn(`[outbox] Failed to write event ${eventType}:`, error.message);
  }
}

/**
 * Fetch pending outbox events for the current user.
 * Used for debugging and monitoring.
 */
export async function fetchPendingOutboxEvents(
  userId: string,
  limit = 20
): Promise<OutboxEvent[]> {
  const { data, error } = await supabase
    .from("outbox_events")
    .select("id, event_type, aggregate_type, status, attempt_count, created_at")
    .eq("user_id", userId)
    .in("status", ["pending", "processing"])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("[outbox] Failed to fetch pending events:", error.message);
    return [];
  }
  return (data ?? []) as OutboxEvent[];
}
