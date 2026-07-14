// Trigger hypotheses + forecasts. Forecast writes are reserved for the AI/ML phase;
// here we only expose READS so the frontend can render existing results.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sb } from "./_helpers";

export const listTriggerHypotheses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await sb(context.supabase)
      .from("trigger_hypotheses").select("*").eq("user_id", context.userId)
      .order("confidence", { ascending: false, nullsFirst: false });
    if (error) throw error;
    return data;
  });

export const updateTriggerHypothesisStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["proposed", "confirmed", "rejected", "watching"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await sb(context.supabase)
      .from("trigger_hypotheses").update({ status: data.status })
      .eq("id", data.id).eq("user_id", context.userId).select().single();
    if (error) throw error;
    return row;
  });

export const getLatestForecast = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await sb(context.supabase)
      .from("forecasts").select("*").eq("user_id", context.userId)
      .order("generated_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    return data;
  });
