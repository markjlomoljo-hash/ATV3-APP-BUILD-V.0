// FaceAtlas scan metadata + annotations + raw-image storage lifecycle.
// Raw photos live in private bucket `face-scans-raw`. Per PRD privacy rules:
// if user has not opted in to raw_image_retention, the raw image is deleted
// immediately after analysis completes (finalizeScan).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sb } from "./_helpers";

const ANGLES = ["front", "left", "right", "chin_up", "forehead"] as const;

const createScan = z.object({
  angle: z.enum(ANGLES),
  captured_at: z.string().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const createFaceScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createScan.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await sb(context.supabase)
      .from("face_scans")
      .insert({
        user_id: context.userId,
        angle: data.angle,
        captured_at: data.captured_at ?? new Date().toISOString(),
        notes: data.notes ?? null,
        status: "pending_upload",
      })
      .select().single();
    if (error) throw error;
    return row;
  });

// Returns a short-lived signed upload URL for the raw image into the private bucket.
export const getScanUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ scan_id: z.string().uuid(), content_type: z.string().default("image/jpeg") }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.content_type !== "image/jpeg") throw new Error("UnsupportedContentType");
    const sup = sb(context.supabase);
    const { data: scan, error: scanError } = await sup
      .from("face_scans")
      .select("id")
      .eq("id", data.scan_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (scanError) throw scanError;
    if (!scan) throw new Error("ScanNotFound");
    const path = `${context.userId}/${data.scan_id}.jpg`;
    const { data: signed, error } = await sup
      .storage.from("face-scans-raw")
      .createSignedUploadUrl(path);
    if (error) throw error;
    const { data: updated, error: updateError } = await sb(context.supabase)
      .from("face_scans")
      .update({ storage_path: path, status: "uploading" })
      .eq("id", data.scan_id)
      .eq("user_id", context.userId)
      .select("id")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updated) throw new Error("ScanNotFound");
    return { url: signed.signedUrl, token: signed.token, path };
  });

const finalize = z.object({
  scan_id: z.string().uuid(),
  user_certainty: z.number().min(0).max(1).nullable().optional(),
});

// A client may only finish upload and queue real server analysis. Derived fields
// and raw-image retention are handled by the authenticated ML worker.
export const finalizeFaceScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => finalize.parse(d))
  .handler(async ({ data, context }) => {
    const sup = sb(context.supabase);
    const { data: scan, error: e1 } = await sup
      .from("face_scans").select("*").eq("id", data.scan_id).eq("user_id", context.userId).single();
    if (e1 || !scan) throw e1 ?? new Error("NotFound");

    const { data: updated, error: e2 } = await sup
      .from("face_scans")
      .update({
        status: "queued_for_cloud",
        user_certainty: data.user_certainty ?? null,
      })
      .eq("id", data.scan_id).eq("user_id", context.userId)
      .select().single();
    if (e2) throw e2;
    return updated;
  });

export const listFaceScans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ limit: z.number().int().min(1).max(200).default(50) }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await sb(context.supabase)
      .from("face_scans").select("*")
      .eq("user_id", context.userId)
      .order("captured_at", { ascending: false })
      .limit(data.limit);
    if (error) throw error;
    return rows;
  });

export const getFaceScan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await sb(context.supabase)
      .from("face_scans").select("*").eq("id", data.id).eq("user_id", context.userId).maybeSingle();
    if (error) throw error;
    return row;
  });

export const deleteFaceScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sup = sb(context.supabase);
    const { data: scan, error: scanError } = await sup
      .from("face_scans")
      .select("storage_path")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (scanError) throw scanError;
    if (!scan) throw new Error("ScanNotFound");
    if (scan.storage_path) {
      const { error: storageError } = await sup.storage
        .from("face-scans-raw")
        .remove([scan.storage_path]);
      if (storageError) throw storageError;
    }
    const { error } = await sup.from("face_scans").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

// ----- annotations -----
const annotation = z.object({
  scan_id: z.string().uuid(),
  lesion_type: z.string().max(64).nullable().optional(),
  x: z.number().min(0).max(1).nullable().optional(),
  y: z.number().min(0).max(1).nullable().optional(),
  w: z.number().min(0).max(1).nullable().optional(),
  h: z.number().min(0).max(1).nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const createAnnotation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => annotation.parse(d))
  .handler(async ({ data, context }) => {
    const sup = sb(context.supabase);
    const { data: scan, error: scanError } = await sup
      .from("face_scans").select("id").eq("id", data.scan_id).eq("user_id", context.userId).maybeSingle();
    if (scanError) throw scanError;
    if (!scan) throw new Error("ScanNotFound");
    const { data: row, error } = await sup
      .from("annotations").insert({ user_id: context.userId, ...data, source: "user" }).select().single();
    if (error) throw error;
    return row;
  });

export const listAnnotations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ scan_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await sb(context.supabase)
      .from("annotations").select("*").eq("scan_id", data.scan_id).eq("user_id", context.userId);
    if (error) throw error;
    return rows;
  });

export const deleteAnnotation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await sb(context.supabase)
      .from("annotations").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });
