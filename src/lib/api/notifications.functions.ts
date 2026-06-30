// Notifications + per-user preferences.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sb } from "./_helpers";

const prefs = z.object({
  push_enabled: z.boolean().optional(),
  email_enabled: z.boolean().optional(),
  quiet_hours: z.record(z.string(), z.any()).nullable().optional(),
  categories: z.record(z.string(), z.boolean()).nullable().optional(),
});

export const getNotificationPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await sb(context.supabase)
      .from("notification_preferences").select("*").eq("user_id", context.userId).maybeSingle();
    if (error) throw error;
    return data;
  });

export const updateNotificationPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => prefs.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await sb(context.supabase)
      .from("notification_preferences")
      .upsert({ user_id: context.userId, ...data }, { onConflict: "user_id" })
      .select().single();
    if (error) throw error;
    return row;
  });

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ limit: z.number().int().min(1).max(200).default(50) }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await sb(context.supabase)
      .from("notifications").select("*").eq("user_id", context.userId)
      .order("created_at", { ascending: false }).limit(data.limit);
    if (error) throw error;
    return rows;
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await sb(context.supabase)
      .from("notifications").update({ read_at: new Date().toISOString() })
      .eq("id", data.id).eq("user_id", context.userId).select().single();
    if (error) throw error;
    return row;
  });
