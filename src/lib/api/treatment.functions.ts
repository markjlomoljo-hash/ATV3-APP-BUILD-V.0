// Treatment plans + treatment tasks.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sb } from "./_helpers";

const plan = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(4000).nullable().optional(),
  schedule: z.record(z.string(), z.any()).nullable().optional(),
  safety_flags: z.array(z.string()).nullable().optional(),
  status: z.enum(["draft", "active", "paused", "completed", "abandoned"]).optional(),
  started_at: z.string().nullable().optional(),
  ended_at: z.string().nullable().optional(),
});

export const createTreatmentPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => plan.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await sb(context.supabase)
      .from("treatment_plans").insert({ user_id: context.userId, ...data }).select().single();
    if (error) throw error;
    return row;
  });

export const updateTreatmentPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), patch: plan.partial() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await sb(context.supabase)
      .from("treatment_plans").update(data.patch).eq("id", data.id).eq("user_id", context.userId)
      .select().single();
    if (error) throw error;
    return row;
  });

export const listTreatmentPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await sb(context.supabase)
      .from("treatment_plans").select("*").eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  });

const task = z.object({
  plan_id: z.string().uuid(),
  task_name: z.string().min(1).max(200),
  due_at: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.any()).nullable().optional(),
});

export const createTreatmentTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => task.parse(d))
  .handler(async ({ data, context }) => {
    const sup = sb(context.supabase);
    const { data: plan, error: planError } = await sup
      .from("treatment_plans").select("id").eq("id", data.plan_id).eq("user_id", context.userId).maybeSingle();
    if (planError) throw planError;
    if (!plan) throw new Error("TreatmentPlanNotFound");
    const { data: row, error } = await sup
      .from("treatment_tasks").insert({ user_id: context.userId, ...data }).select().single();
    if (error) throw error;
    return row;
  });

export const completeTreatmentTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), skipped: z.boolean().default(false) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await sb(context.supabase)
      .from("treatment_tasks").update({
        completed_at: data.skipped ? null : new Date().toISOString(),
        skipped: data.skipped,
      })
      .eq("id", data.id).eq("user_id", context.userId).select().single();
    if (error) throw error;
    return row;
  });

export const listTreatmentTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ plan_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await sb(context.supabase)
      .from("treatment_tasks").select("*").eq("plan_id", data.plan_id).eq("user_id", context.userId)
      .order("due_at", { ascending: true, nullsFirst: false });
    if (error) throw error;
    return rows;
  });
