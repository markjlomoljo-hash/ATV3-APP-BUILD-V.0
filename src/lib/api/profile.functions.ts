// Profile + onboarding sub-tables.
// All writes scoped to authenticated user via RLS.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sb } from "./_helpers";

// ----- profiles -----
const profileUpsert = z.object({
  display_name: z.string().max(120).nullable().optional(),
  timezone: z.string().max(64).nullable().optional(),
  climate_preference: z.string().max(64).nullable().optional(),
  date_of_birth: z.string().nullable().optional(),
  sex: z.string().max(32).nullable().optional(),
  skin_tone: z.string().max(32).nullable().optional(),
  imaging_calibration: z.record(z.string(), z.any()).nullable().optional(),
  onboarding_completed: z.boolean().optional(),
});

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await sb(context.supabase)
      .from("profiles")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  });

export const upsertProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => profileUpsert.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await sb(context.supabase)
      .from("profiles")
      .upsert({ user_id: context.userId, ...data }, { onConflict: "user_id" })
      .select()
      .single();
    if (error) throw error;
    return row;
  });

// ----- acne_history -----
const acneHistory = z.object({
  onset_age: z.number().int().min(0).max(120).nullable().optional(),
  duration_years: z.number().min(0).max(120).nullable().optional(),
  severity: z.enum(["mild", "moderate", "severe"]).nullable().optional(),
  flare_frequency: z.string().max(64).nullable().optional(),
  self_assessment: z.string().max(2000).nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
});

export const upsertAcneHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => acneHistory.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await sb(context.supabase)
      .from("acne_history")
      .upsert({ user_id: context.userId, ...data }, { onConflict: "user_id" })
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const getAcneHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await sb(context.supabase)
      .from("acne_history").select("*").eq("user_id", context.userId).maybeSingle();
    if (error) throw error;
    return data;
  });

// ----- skin_type_barrier -----
const skinType = z.object({
  oiliness: z.string().max(32).nullable().optional(),
  dryness: z.string().max(32).nullable().optional(),
  sensitivity: z.string().max(32).nullable().optional(),
  barrier_symptoms: z.array(z.string()).nullable().optional(),
  allergies: z.array(z.string()).nullable().optional(),
});

export const upsertSkinType = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => skinType.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await sb(context.supabase)
      .from("skin_type_barrier")
      .upsert({ user_id: context.userId, ...data }, { onConflict: "user_id" })
      .select().single();
    if (error) throw error;
    return row;
  });

export const getSkinType = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await sb(context.supabase)
      .from("skin_type_barrier").select("*").eq("user_id", context.userId).maybeSingle();
    if (error) throw error;
    return data;
  });

// ----- lifestyle_triggers -----
const lifestyle = z.object({
  sleep_schedule: z.record(z.string(), z.any()).nullable().optional(),
  stress_level: z.string().max(32).nullable().optional(),
  diet_patterns: z.array(z.string()).nullable().optional(),
  hydration_liters: z.number().min(0).max(20).nullable().optional(),
  exercise_frequency: z.string().max(64).nullable().optional(),
  occlusion_exposures: z.array(z.string()).nullable().optional(),
});

export const upsertLifestyle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => lifestyle.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await sb(context.supabase)
      .from("lifestyle_triggers")
      .upsert({ user_id: context.userId, ...data }, { onConflict: "user_id" })
      .select().single();
    if (error) throw error;
    return row;
  });

export const getLifestyle = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await sb(context.supabase)
      .from("lifestyle_triggers").select("*").eq("user_id", context.userId).maybeSingle();
    if (error) throw error;
    return data;
  });

// ----- goals_constraints -----
const goals = z.object({
  primary_goals: z.array(z.string()).nullable().optional(),
  urgency: z.string().max(32).nullable().optional(),
  budget: z.string().max(32).nullable().optional(),
  fragrance_preference: z.string().max(32).nullable().optional(),
  texture_preference: z.string().max(32).nullable().optional(),
  constraints: z.record(z.string(), z.any()).nullable().optional(),
});

export const upsertGoals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => goals.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await sb(context.supabase)
      .from("goals_constraints")
      .upsert({ user_id: context.userId, ...data }, { onConflict: "user_id" })
      .select().single();
    if (error) throw error;
    return row;
  });

export const getGoals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await sb(context.supabase)
      .from("goals_constraints").select("*").eq("user_id", context.userId).maybeSingle();
    if (error) throw error;
    return data;
  });
