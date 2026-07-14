// Permissioned native weather/location snapshots. Coordinates are coarsened to ~0.1 deg.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sb } from "./_helpers";

function coarsen(v: number): number {
  return Math.round(v * 10) / 10;
}

const snapshot = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  temperature_c: z.number().nullable().optional(),
  humidity_pct: z.number().min(0).max(100).nullable().optional(),
  uv_index: z.number().min(0).max(20).nullable().optional(),
  aqi: z.number().int().min(0).max(1000).nullable().optional(),
  pollen: z.record(z.string(), z.any()).nullable().optional(),
  source: z.string().max(64).nullable().optional(),
  confidence: z.number().min(0).max(1).nullable().optional(),
});

export const recordWeatherSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => snapshot.parse(d))
  .handler(async ({ data, context }) => {
    const { lat, lon, ...rest } = data;
    const { data: row, error } = await sb(context.supabase)
      .from("weather_snapshots")
      .insert({
        user_id: context.userId,
        coarse_lat: coarsen(lat),
        coarse_lon: coarsen(lon),
        recorded_at: new Date().toISOString(),
        ...rest,
      })
      .select().single();
    if (error) throw error;
    return row;
  });

export const listWeatherSnapshots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ limit: z.number().int().min(1).max(200).default(50) }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await sb(context.supabase)
      .from("weather_snapshots").select("*").eq("user_id", context.userId)
      .order("recorded_at", { ascending: false }).limit(data.limit);
    if (error) throw error;
    return rows;
  });
