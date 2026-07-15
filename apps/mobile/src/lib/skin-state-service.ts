/**
 * SkinState Service — daily acne activity journal
 * Zero-fabrication: all values from real user input, no AI inference
 */
import { supabase } from './supabase';

export type LesionTypes = {
  inflammatory: boolean;
  comedonal: boolean;
  nodular_cystic: boolean;
  unsure: boolean;
};

export type SkinStateLog = {
  id: string;
  user_id: string;
  log_date: string; // YYYY-MM-DD
  overall_activity: 'none' | 'mild' | 'moderate' | 'severe' | 'unknown' | null;
  change_from_baseline: 'better' | 'same' | 'worse' | 'unknown' | null;
  new_lesions: number | null;
  healing_lesions: number | null;
  persistent_lesions: number | null;
  lesion_count_uncertain: boolean;
  lesion_types: LesionTypes | null;
  dominant_zones: string[] | null;
  inflammation_level: number | null; // 0-5
  oiliness_level: number | null; // 0-5
  dryness_level: number | null; // 0-5
  sensitivity_symptoms: string[] | null;
  barrier_symptoms: string[] | null;
  pih_concern: boolean | null;
  scarring_concern: boolean | null;
  interpretation: 'ordinary_breakout' | 'suspected_purging' | 'irritation' | 'no_change' | 'unsure' | null;
  picking_touching: boolean | null;
  picking_notes: string | null;
  confidence: 'high' | 'medium' | 'low' | 'unsure';
  notes: string | null;
  revision: number;
  is_backfill: boolean;
  backfill_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type SkinStateInput = Omit<SkinStateLog, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'revision'>;

export type SaveState =
  | 'idle'
  | 'validating'
  | 'saving'
  | 'saved'
  | 'updated'
  | 'offline_queued'
  | 'conflict_detected'
  | 'failed';

/**
 * Fetch the skin state log for a specific date (returns null if not logged)
 */
export async function fetchSkinStateForDate(date: string): Promise<SkinStateLog | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('skin_state_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('log_date', date)
    .maybeSingle();

  if (error) throw error;
  return data as SkinStateLog | null;
}

/**
 * Upsert (create or update) a skin state log for a given date.
 * Same-day saves update the existing record (merge semantics).
 */
export async function upsertSkinState(
  date: string,
  input: Partial<SkinStateInput>
): Promise<SkinStateLog> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check for existing record to increment revision
  const existing = await fetchSkinStateForDate(date);
  const revision = existing ? existing.revision + 1 : 1;

  const payload = {
    user_id: user.id,
    log_date: date,
    revision,
    ...input,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('skin_state_logs')
    .upsert(payload, { onConflict: 'user_id,log_date' })
    .select()
    .single();

  if (error) throw error;
  return data as SkinStateLog;
}

/**
 * Fetch skin state history (paginated, most recent first)
 */
export async function fetchSkinStateHistory(
  limit = 30,
  offset = 0
): Promise<SkinStateLog[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('skin_state_logs')
    .select('*')
    .eq('user_id', user.id)
    .order('log_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return (data ?? []) as SkinStateLog[];
}

/**
 * Fetch the last N skin state entries for comparison (no causal claims)
 */
export async function fetchRecentSkinStates(days = 7): Promise<SkinStateLog[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('skin_state_logs')
    .select('*')
    .eq('user_id', user.id)
    .gte('log_date', sinceStr)
    .order('log_date', { ascending: false });

  if (error) throw error;
  return (data ?? []) as SkinStateLog[];
}

/**
 * Delete a skin state log (soft delete via is_backfill flag is not applicable here;
 * hard delete is allowed for user data control)
 */
export async function deleteSkinState(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('skin_state_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id); // RLS double-check

  if (error) throw error;
}

// Zone labels for UI
export const SKIN_ZONES = [
  { id: 'forehead', label: 'Forehead' },
  { id: 'nose', label: 'Nose' },
  { id: 'chin', label: 'Chin' },
  { id: 'left_cheek', label: 'Left Cheek' },
  { id: 'right_cheek', label: 'Right Cheek' },
  { id: 'jawline', label: 'Jawline' },
  { id: 'neck', label: 'Neck' },
  { id: 'back', label: 'Back' },
  { id: 'chest', label: 'Chest' },
];

export const SENSITIVITY_SYMPTOMS = [
  { id: 'tightness', label: 'Tightness' },
  { id: 'stinging', label: 'Stinging' },
  { id: 'burning', label: 'Burning' },
  { id: 'peeling', label: 'Peeling' },
  { id: 'itching', label: 'Itching' },
  { id: 'tenderness', label: 'Tenderness/Pain' },
];

export const BARRIER_SYMPTOMS = [
  { id: 'redness', label: 'Redness' },
  { id: 'flaking', label: 'Flaking' },
  { id: 'rough_texture', label: 'Rough Texture' },
];

export const ACTIVITY_LABELS: Record<string, string> = {
  none: 'None / Clear',
  mild: 'Mild',
  moderate: 'Moderate',
  severe: 'Severe',
  unknown: 'Not Sure',
};

export const INTERPRETATION_LABELS: Record<string, string> = {
  ordinary_breakout: 'Ordinary Breakout',
  suspected_purging: 'Possible Purging (uncertain)',
  irritation: 'Irritation / Reaction',
  no_change: 'No Meaningful Change',
  unsure: 'Not Sure',
};

export const INTERPRETATION_CAUTIONS: Record<string, string> = {
  suspected_purging:
    'Purging is uncertain and may be difficult to distinguish from irritation. If symptoms are severe or worsening, consider pausing the product and consulting a provider.',
  irritation:
    'If you experience severe redness, swelling, eye/mucosal involvement, or systemic symptoms, stop use and seek medical guidance promptly.',
};
