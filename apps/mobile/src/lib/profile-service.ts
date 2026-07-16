import { supabase } from "./supabase";
import { Profile, ConsentSettings } from "../stores/profile";
import { randomUUID } from "expo-crypto";
import { apiFetch, apiMutation, createMutationOperation } from "./api";

export type ProfessionalProfileSection = {
  sectionKey: string;
  value: Record<string, unknown>;
  version: number;
  updatedAt: string | null;
  updatedBy: string | null;
  isVersioned: boolean;
};

export type ProfessionalProfile = {
  sections: ProfessionalProfileSection[];
};

export async function fetchProfessionalProfile(): Promise<ProfessionalProfile> {
  const response = await apiFetch<{ ok: true; profile: ProfessionalProfile }>(
    "/api/profile/professional",
  );
  return response.profile;
}

export async function updateProfessionalProfileSection(
  sectionKey: "acne_history" | "lifestyle_baseline",
  value: Record<string, unknown>,
  reason: "profile_acne_history_edit" | "profile_lifestyle_baseline_edit",
): Promise<ProfessionalProfileSection> {
  const response = await apiMutation<
    { ok: true; section: ProfessionalProfileSection },
    { value: Record<string, unknown>; reason: string; includeInReports: boolean }
  >(
    "PATCH",
    `/api/profile/sections/${sectionKey}`,
    createMutationOperation({ value, reason, includeInReports: true }),
  );
  return response.section;
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
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: userId,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  if (error) throw new Error(`profile_upsert_failed: ${error.message}`);
  return data as Profile;
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
): Promise<ConsentSettings> {
  // Check if record exists
  const existing = await fetchConsents(userId);

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
    if (error) throw new Error(`consents_update_failed: ${error.message}`);
    return data as ConsentSettings;
  } else {
    const { data, error } = await supabase
      .from("consent_settings")
      .insert({
        id: randomUUID(),
        user_id: userId,
        anonymous_learning: false,
        raw_image_learning: false,
        include_faceatlas_photos_in_reports: false,
        include_treatment_details_in_reports: false,
        marketing_notifications: false,
        product_analysis_notifications: true,
        report_ready_notifications: true,
        streak_risk_notifications: true,
        weather_alert_notifications: false,
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw new Error(`consents_insert_failed: ${error.message}`);
    return data as ConsentSettings;
  }
}

export async function markOnboardingComplete(userId: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        user_id: userId,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  if (error) throw new Error(`onboarding_complete_failed: ${error.message}`);
}
