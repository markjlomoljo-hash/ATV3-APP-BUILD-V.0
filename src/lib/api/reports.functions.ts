// Clinical reports. PDF compilation runs in a later phase; here we manage metadata
// and signed download URLs for the `reports` bucket.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sb } from "./_helpers";

export const requestReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await sb(context.supabase)
      .from("reports").insert({ user_id: context.userId, state: "queued" }).select().single();
    if (error) throw error;
    return data;
  });

export const listReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await sb(context.supabase)
      .from("reports").select("*").eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  });

export const getReportDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sup = sb(context.supabase);
    const { data: report } = await sup
      .from("reports").select("storage_path,state").eq("id", data.id).eq("user_id", context.userId).maybeSingle();
    if (!report?.storage_path) return { url: null, state: report?.state ?? "missing" };
    const { data: signed, error } = await sup.storage.from("reports")
      .createSignedUrl(report.storage_path, 60 * 10);
    if (error) throw error;
    return { url: signed.signedUrl, state: report.state };
  });
