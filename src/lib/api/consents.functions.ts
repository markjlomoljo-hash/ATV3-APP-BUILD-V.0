// User consents (anonymous learning, raw image retention, marketing, research, personal learning).
// Per PRD: raw image retention defaults to false; if false, raw face scans MUST be deleted
// immediately after analysis.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sb } from "./_helpers";

const consentSchema = z.object({
  anonymous_learning: z.boolean().optional(),
  personal_learning: z.boolean().optional(),
  raw_image_retention: z.boolean().optional(),
  research_share: z.boolean().optional(),
  marketing: z.boolean().optional(),
});

export const getConsents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await sb(context.supabase)
      .from("consents").select("*").eq("user_id", context.userId).maybeSingle();
    if (error) throw error;
    return data;
  });

export const updateConsents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => consentSchema.parse(d))
  .handler(async ({ data, context }) => {
    const payload = {
      user_id: context.userId,
      ...data,
      consented_at: new Date().toISOString(),
    };
    const { data: row, error } = await sb(context.supabase)
      .from("consents")
      .upsert(payload, { onConflict: "user_id" })
      .select().single();
    if (error) throw error;
    return row;
  });
