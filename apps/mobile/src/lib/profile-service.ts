import { supabase } from "./supabase";
import { Profile, ConsentSettings } from "../stores/profile";
import { randomUUID } from "expo-crypto";

import { writeOutboxEvent, type OutboxEventType } from "./outbox-service";
import {
  enqueueLocalOutboxEvent,
  replayPendingOutboxEvents,
} from "./local-outbox";
import { isNetworkAvailable, isNetworkError } from "./network";
import { CONSENT_DEFAULTS } from "./contracts";

// Same write-outcome contract as daily-logs-service: a write either really
// persisted ("saved") or was durably queued on-device ("queued_offline").
export type WriteOutcome<T> =
  | { status: "saved"; data: T }
  | { status: "queued_offline" };

function afterSuccessfulWrite(
  userId: string,
  eventType: OutboxEventType,
  aggregateType: string,
  aggregateId: string,
  payload: Record<string, unknown>,
  deduplicationKey: string
): void {
  void writeOutboxEvent(
    userId,
    eventType,
    aggregateType,
    aggregateId,
    payload,
    deduplicationKey
  ).catch(() => undefined);
  void replayPendingOutboxEvents().catch(() => undefined);
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // no rows
    throw new Error(`profile_fetch_failed: ${error.message}`);
  }
  return data as Profile;
}

export async function upsertProfile(
  userId: string,
  updates: Partial<
    Omit<Profile, "id" | "user_id" | "created_at" | "updated_at">
  >
): Promise<WriteOutcome<Profile>> {
  const row = {
    user_id: userId,
    ...updates,
    updated_at: new Date().toISOString(),
  };
  const dedupKey = `${userId}:profile.updated`;

  const queueOffline = async (): Promise<WriteOutcome<Profile>> => {
    await enqueueLocalOutboxEvent(
      userId,
      "profile.updated",
      "profile",
      userId,
      row,
      dedupKey
    );
    return { status: "queued_offline" };
  };

  if (!(await isNetworkAvailable())) return queueOffline();

  const { data, error } = await supabase
    .from("profiles")
    .upsert(row, { onConflict: "user_id" })
    .select()
    .single();

  if (error) {
    if (isNetworkError(error.message)) return queueOffline();
    throw new Error(`profile_upsert_failed: ${error.message}`);
  }
  afterSuccessfulWrite(userId, "profile.updated", "profile", userId, row, dedupKey);
  return { status: "saved", data: data as Profile };
}

export async function upsertProfileSection(
  userId: string,
  sectionKey: string,
  valueJson: Record<string, unknown>
): Promise<WriteOutcome<null>> {
  const row = {
    user_id: userId,
    section_key: sectionKey,
    value_json: valueJson,
    version: 1,
    updated_by: "user",
  };
  const dedupKey = `${userId}:profile.updated:section:${sectionKey}`;

  const queueOffline = async (): Promise<WriteOutcome<null>> => {
    await enqueueLocalOutboxEvent(
      userId,
      "profile.updated",
      "profile_section",
      `${userId}:${sectionKey}`,
      row,
      dedupKey
    );
    return { status: "queued_offline" };
  };

  if (!(await isNetworkAvailable())) return queueOffline();

  const { error } = await supabase
    .from("profile_sections")
    .upsert(row, { onConflict: "user_id,section_key" });

  if (error) {
    if (isNetworkError(error.message)) return queueOffline();
    throw new Error(`profile_section_upsert_failed: ${error.message}`);
  }
  afterSuccessfulWrite(
    userId,
    "profile.updated",
    "profile_section",
    `${userId}:${sectionKey}`,
    row,
    dedupKey
  );
  return { status: "saved", data: null };
}

export async function fetchConsents(
  userId: string
): Promise<ConsentSettings | null> {
  const { data, error } = await supabase
    .from("consent_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`consents_fetch_failed: ${error.message}`);
  }
  return data as ConsentSettings;
}

export async function upsertConsents(
  userId: string,
  updates: Partial<
    Omit<ConsentSettings, "id" | "user_id" | "updated_at">
  >
): Promise<WriteOutcome<ConsentSettings>> {
  const dedupKey = `${userId}:consent.updated`;

  const queueOffline = async (): Promise<WriteOutcome<ConsentSettings>> => {
    await enqueueLocalOutboxEvent(
      userId,
      "consent.updated",
      "consent_settings",
      userId,
      updates as Record<string, unknown>,
      dedupKey
    );
    return { status: "queued_offline" };
  };

  if (!(await isNetworkAvailable())) return queueOffline();

  // Check if record exists
  let existing: ConsentSettings | null;
  try {
    existing = await fetchConsents(userId);
  } catch (error) {
    if (isNetworkError(error)) return queueOffline();
    throw error;
  }

  if (existing) {
    const { data, error } = await supabase
      .from("consent_settings")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .select()
      .single();
    if (error) {
      if (isNetworkError(error.message)) return queueOffline();
      throw new Error(`consents_update_failed: ${error.message}`);
    }
    afterSuccessfulWrite(
      userId,
      "consent.updated",
      "consent_settings",
      userId,
      updates as Record<string, unknown>,
      dedupKey
    );
    return { status: "saved", data: data as ConsentSettings };
  } else {
    const { data, error } = await supabase
      .from("consent_settings")
      .insert({
        id: randomUUID(),
        user_id: userId,
        ...CONSENT_DEFAULTS,
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) {
      if (isNetworkError(error.message)) return queueOffline();
      throw new Error(`consents_insert_failed: ${error.message}`);
    }
    afterSuccessfulWrite(
      userId,
      "consent.updated",
      "consent_settings",
      userId,
      updates as Record<string, unknown>,
      dedupKey
    );
    return { status: "saved", data: data as ConsentSettings };
  }
}

export async function markOnboardingComplete(
  userId: string
): Promise<WriteOutcome<null>> {
  const row = {
    user_id: userId,
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  };
  const dedupKey = `${userId}:onboarding.completed`;

  const queueOffline = async (): Promise<WriteOutcome<null>> => {
    await enqueueLocalOutboxEvent(
      userId,
      "onboarding.completed",
      "profile",
      userId,
      row,
      dedupKey
    );
    return { status: "queued_offline" };
  };

  if (!(await isNetworkAvailable())) return queueOffline();

  const { error } = await supabase
    .from("profiles")
    .upsert(row, { onConflict: "user_id" });
  if (error) {
    if (isNetworkError(error.message)) return queueOffline();
    throw new Error(`onboarding_complete_failed: ${error.message}`);
  }
  afterSuccessfulWrite(userId, "onboarding.completed", "profile", userId, row, dedupKey);
  return { status: "saved", data: null };
}

// ─── Deletion requests ────────────────────────────────────────────────────────
// The deletion_requests table is readable by its owner but only writable by
// the backend deletion pipeline. The mobile client therefore reads honestly
// and never pretends to have created a request itself.

export interface DeletionRequest {
  id: string;
  request_type: string;
  status: string;
  requested_at: string;
  scheduled_purge_at: string | null;
  completed_at: string | null;
}

export async function fetchDeletionRequests(
  userId: string
): Promise<DeletionRequest[]> {
  const { data, error } = await supabase
    .from("deletion_requests")
    .select("id, request_type, status, requested_at, scheduled_purge_at, completed_at")
    .eq("user_id", userId)
    .order("requested_at", { ascending: false })
    .limit(10);

  if (error) throw new Error(`deletion_requests_fetch_failed: ${error.message}`);
  return (data ?? []) as DeletionRequest[];
}
