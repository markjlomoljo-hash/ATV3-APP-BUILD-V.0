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
  .handler(async ({ data, context }) => {
    const sup = sb(context.supabase);
    const { data: existing } = await sup
      .from("gamification").select("*").eq("user_id", context.userId).maybeSingle();

    const now = new Date();
    const last = existing?.last_action_at ? new Date(existing.last_action_at) : null;
    const dayMs = 24 * 60 * 60 * 1000;
    let streak = existing?.current_streak ?? 0;
    if (!last) streak = 1;
    else {
      const diffDays = Math.floor((now.setHours(0, 0, 0, 0) - new Date(last).setHours(0, 0, 0, 0)) / dayMs);
      if (diffDays === 0) streak = streak || 1;
      else if (diffDays === 1) streak = (existing!.current_streak ?? 0) + 1;
      else streak = 1;
    }
    const longest = Math.max(existing?.longest_streak ?? 0, streak);
    const points = (existing?.points ?? 0) + data.points;
    const pet_xp = (existing?.pet_xp ?? 0) + data.points;
    const pet_stage =
      pet_xp >= 5000 ? "ascended" : pet_xp >= 2000 ? "adult" : pet_xp >= 500 ? "juvenile" : "egg";

    const { data: row, error } = await sup
      .from("gamification")
      .upsert(
        {
          user_id: context.userId,
          current_streak: streak,
          longest_streak: longest,
          points,
          pet_xp,
          pet_stage,
          last_action_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select().single();
    if (error) throw error;
    return row;
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
  .handler(async ({ data, context }) => {
    const sup = sb(context.supabase);
    const { data: badge, error: e1 } = await sup
      .from("badges").select("id").eq("code", data.badge_code).maybeSingle();
    if (e1 || !badge) throw e1 ?? new Error("BadgeNotFound");
    const { data: row, error } = await sup
      .from("user_badges")
      .upsert({ user_id: context.userId, badge_id: badge.id }, { onConflict: "user_id,badge_id" })
      .select().single();
    if (error) throw error;
    return row;
  });
