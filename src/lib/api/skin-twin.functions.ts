// Skin Twin visual simulation snapshots. Preview images live in private `skin-twin` bucket.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sb } from "./_helpers";

const snapshot = z.object({
  scenario: z.string().max(120).nullable().optional(),
  simulation: z.record(z.string(), z.any()).nullable().optional(),
  preview_storage_path: z.string().max(500).nullable().optional(),
});

export const createSkinTwinSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => snapshot.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await sb(context.supabase)
      .from("skin_twin_snapshots").insert({ user_id: context.userId, ...data })
      .select().single();
    if (error) throw error;
    return row;
  });

export const listSkinTwinSnapshots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ limit: z.number().int().min(1).max(100).default(20) }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await sb(context.supabase)
      .from("skin_twin_snapshots").select("*").eq("user_id", context.userId)
      .order("snapshot_at", { ascending: false }).limit(data.limit);
    if (error) throw error;
    return rows;
  });

export const getSkinTwinPreviewUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ snapshot_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sup = sb(context.supabase);
    const { data: snap } = await sup.from("skin_twin_snapshots")
      .select("preview_storage_path").eq("id", data.snapshot_id).eq("user_id", context.userId).maybeSingle();
    if (!snap?.preview_storage_path) return { url: null };
    const { data: signed, error } = await sup.storage.from("skin-twin")
      .createSignedUrl(snap.preview_storage_path, 60 * 5);
    if (error) throw error;
    return { url: signed.signedUrl };
  });
