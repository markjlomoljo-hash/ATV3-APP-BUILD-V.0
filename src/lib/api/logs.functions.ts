// SleepDerm sleep logs and meal-baseline food logs.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sb } from "./_helpers";

// ----- sleep_logs -----
const sleepLog = z.object({
  log_date: z.string(), // YYYY-MM-DD
  sleep_time: z.string().nullable().optional(), // ISO timestamp
  wake_time: z.string().nullable().optional(),
  quality: z.number().int().min(1).max(10).nullable().optional(),
  disturbances: z.array(z.string()).nullable().optional(),
  naps: z.array(z.record(z.string(), z.any())).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const upsertSleepLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => sleepLog.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await sb(context.supabase)
      .from("sleep_logs")
      .upsert({ user_id: context.userId, ...data }, { onConflict: "user_id,log_date" })
      .select().single();
    if (error) throw error;
    return row;
  });

export const listSleepLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      limit: z.number().int().min(1).max(365).default(60),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = sb(context.supabase).from("sleep_logs").select("*").eq("user_id", context.userId);
    if (data.from) q = q.gte("log_date", data.from);
    if (data.to) q = q.lte("log_date", data.to);
    const { data: rows, error } = await q.order("log_date", { ascending: false }).limit(data.limit);
    if (error) throw error;
    return rows;
  });

// ----- food_logs -----
const foodLog = z.object({
  log_date: z.string(),
  meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  items: z.array(z.record(z.string(), z.any())).nullable().optional(),
  categories: z.array(z.string()).nullable().optional(),
  is_baseline: z.boolean().optional(),
  completed: z.boolean().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const createFoodLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => foodLog.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await sb(context.supabase)
      .from("food_logs").insert({ user_id: context.userId, ...data }).select().single();
    if (error) throw error;
    return row;
  });

export const updateFoodLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), patch: foodLog.partial() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await sb(context.supabase)
      .from("food_logs").update(data.patch).eq("id", data.id).eq("user_id", context.userId)
      .select().single();
    if (error) throw error;
    return row;
  });

export const listFoodLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      from: z.string().optional(),
      to: z.string().optional(),
      limit: z.number().int().min(1).max(500).default(100),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = sb(context.supabase).from("food_logs").select("*").eq("user_id", context.userId);
    if (data.from) q = q.gte("log_date", data.from);
    if (data.to) q = q.lte("log_date", data.to);
    const { data: rows, error } = await q.order("log_date", { ascending: false }).limit(data.limit);
    if (error) throw error;
    return rows;
  });

export const deleteFoodLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await sb(context.supabase)
      .from("food_logs").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });
