// FormulaLens product + ingredient intelligence. Authenticated reads only; writes are
// reserved for trusted curation jobs (admin role) handled later.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sb } from "./_helpers";

export const searchProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      q: z.string().max(200).optional(),
      barcode: z.string().max(64).optional(),
      limit: z.number().int().min(1).max(50).default(20),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = sb(context.supabase).from("products").select("*");
    if (data.barcode) q = q.eq("barcode", data.barcode);
    if (data.q) q = q.ilike("name", `%${data.q}%`);
    const { data: rows, error } = await q.limit(data.limit);
    if (error) throw error;
    return rows;
  });

export const getProduct = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await sb(context.supabase)
      .from("products").select("*").eq("id", data.id).maybeSingle();
    if (error) throw error;
    return row;
  });

export const lookupIngredient = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ inci: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await sb(context.supabase)
      .from("product_ingredients").select("*").ilike("inci_name", data.inci).maybeSingle();
    if (error) throw error;
    return row;
  });
