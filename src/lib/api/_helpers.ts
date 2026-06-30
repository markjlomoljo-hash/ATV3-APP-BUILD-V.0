// Shared helpers for AcneTrex Phase 3 server functions.
// Every server function uses requireSupabaseAuth, so RLS enforces per-user isolation.
import { z } from "zod";

export const uuid = z.string().uuid();
export const isoDate = z.string().min(8);

// Loosely typed supabase accessor — we rely on RLS + zod for safety,
// and avoid fighting generated Database types for every insert payload.
export function sb(supabase: unknown): any {
  return supabase as any;
}
