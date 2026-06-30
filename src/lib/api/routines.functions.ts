// User routine products (cleanser/moisturizer/sunscreen/actives/prescriptions).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sb } from "./_helpers";

const routine = z.object({
  slot: z.enum(["cleanser", "moisturizer", "sunscreen", "active", "prescription", "other"]),
  product_name: z.string().max(200).nullable().optional(),
  brand: z.string().max(120).nullable().optional(),
  ingredients: z.array(z.string()).nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  active: z.boolean().optional(),
});

export const createRoutineProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => routine.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await sb(context.supabase)
      .from("routine_products").insert({ user_id: context.userId, ...data }).select().single();
    if (error) throw error;
    return row;
  });

export const listRoutineProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await sb(context.supabase)
      .from("routine_products").select("*").eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  });

export const updateRoutineProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), patch: routine.partial() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await sb(context.supabase)
      .from("routine_products").update(data.patch).eq("id", data.id).eq("user_id", context.userId)
      .select().single();
    if (error) throw error;
    return row;
  });

export const deleteRoutineProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await sb(context.supabase)
      .from("routine_products").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });
