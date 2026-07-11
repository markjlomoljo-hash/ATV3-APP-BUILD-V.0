// Gamification: streaks, points, pet evolution, badges.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sb } from "./_helpers";

export const getGamification = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sup = sb(context.supabase);
    const { data, error } = await sup
      .from("gamification").select("*").eq("user_id", context.userId).maybeSingle();
    if (error) throw error;
    if (data) return data;
    const { data: created, error: e2 } = await sup
      .from("gamification").insert({ user_id: context.userId }).select().single();
    if (e2) throw e2;
    return created;
  });

// Record an action; bumps points and updates streak if last_action_at was yesterday.
export const recordAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ points: z.number().int().min(0).max(1000).default(10) }).parse(d ?? {}),
  )
  .handler(async () => {
    throw new Error("durable_task_completion_required");
  });

export const listBadges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await sb(context.supabase).from("badges").select("*").order("code");
    if (error) throw error;
    return data;
  });

export const listMyBadges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await sb(context.supabase)
      .from("user_badges").select("*, badges(*)").eq("user_id", context.userId);
    if (error) throw error;
    return data;
  });

export const claimBadge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ badge_code: z.string().min(1).max(64) }).parse(d))
  .handler(async () => {
    throw new Error("server_badge_evaluation_required");
  });
