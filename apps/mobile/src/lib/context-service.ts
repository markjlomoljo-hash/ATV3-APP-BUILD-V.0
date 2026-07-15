/**
 * Context Logs Service — stress, activity, hydration, contact, cycle
 * Zero-fabrication: all data from real user input
 */
import { supabase } from './supabase';
import * as Crypto from 'expo-crypto';

// ============================================================
// STRESS LOGS
// ============================================================
export type StressLog = {
  id: string;
  user_id: string;
  log_date: string;
  event_id: string;
  intensity: number; // 0-10
  intensity_label: string | null;
  duration_minutes: number | null;
  context_category: string | null;
  coping_context: string | null;
  notes: string | null;
  created_at: string;
};

export async function upsertStressLog(date: string, input: Omit<StressLog, 'id' | 'user_id' | 'created_at' | 'log_date'>): Promise<StressLog> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('stress_logs')
    .upsert({ user_id: user.id, log_date: date, ...input }, { onConflict: 'user_id,event_id' })
    .select().single();
  if (error) throw error;
  return data as StressLog;
}

export async function fetchStressLogsForDate(date: string): Promise<StressLog[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('stress_logs').select('*').eq('user_id', user.id).eq('log_date', date)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as StressLog[];
}

export async function deleteStressLog(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase.from('stress_logs').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw error;
}

// ============================================================
// ACTIVITY LOGS
// ============================================================
export type ActivityLog = {
  id: string;
  user_id: string;
  log_date: string;
  event_id: string;
  activity_type: string;
  start_time: string | null;
  duration_minutes: number | null;
  intensity: 'low' | 'moderate' | 'high' | 'unknown' | null;
  sweat_amount: 'none' | 'light' | 'moderate' | 'heavy' | 'unknown' | null;
  sweat_context: string | null;
  occlusion_gear: string[] | null;
  post_workout_cleanse: boolean | null;
  post_workout_change: boolean | null;
  source: 'manual' | 'wearable_import';
  notes: string | null;
  created_at: string;
};

export async function createActivityLog(date: string, input: Omit<ActivityLog, 'id' | 'user_id' | 'created_at' | 'log_date'>): Promise<ActivityLog> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('activity_logs')
    .insert({ user_id: user.id, log_date: date, ...input })
    .select().single();
  if (error) throw error;
  return data as ActivityLog;
}

export async function fetchActivityLogsForDate(date: string): Promise<ActivityLog[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('activity_logs').select('*').eq('user_id', user.id).eq('log_date', date)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ActivityLog[];
}

export async function deleteActivityLog(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase.from('activity_logs').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw error;
}

// ============================================================
// HYDRATION LOGS
// ============================================================
export type HydrationLog = {
  id: string;
  user_id: string;
  log_date: string;
  event_id: string;
  quantity_ml: number | null;
  quantity_qualitative: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high' | null;
  beverage_type: string | null;
  notes: string | null;
  created_at: string;
};

export async function createHydrationLog(date: string, input: Omit<HydrationLog, 'id' | 'user_id' | 'created_at' | 'log_date'>): Promise<HydrationLog> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('hydration_logs')
    .insert({ user_id: user.id, log_date: date, ...input })
    .select().single();
  if (error) throw error;
  return data as HydrationLog;
}

export async function fetchHydrationLogsForDate(date: string): Promise<HydrationLog[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('hydration_logs').select('*').eq('user_id', user.id).eq('log_date', date)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as HydrationLog[];
}

export async function deleteHydrationLog(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase.from('hydration_logs').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw error;
}

// ============================================================
// CONTACT EVENTS
// ============================================================
export type ContactEvent = {
  id: string;
  user_id: string;
  log_date: string;
  event_id: string;
  contact_type: string;
  frequency: 'once' | 'multiple' | 'continuous' | 'unknown' | null;
  zones_affected: string[] | null;
  notes: string | null;
  created_at: string;
};

export async function createContactEvent(date: string, input: Omit<ContactEvent, 'id' | 'user_id' | 'created_at' | 'log_date'>): Promise<ContactEvent> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('contact_events')
    .insert({ user_id: user.id, log_date: date, ...input })
    .select().single();
  if (error) throw error;
  return data as ContactEvent;
}

export async function fetchContactEventsForDate(date: string): Promise<ContactEvent[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('contact_events').select('*').eq('user_id', user.id).eq('log_date', date)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ContactEvent[];
}

export async function deleteContactEvent(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase.from('contact_events').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw error;
}

// ============================================================
// CYCLE LOGS (consent-gated at application layer)
// ============================================================
export type CycleLog = {
  id: string;
  user_id: string;
  log_date: string;
  phase: 'menstrual' | 'follicular' | 'ovulation' | 'luteal' | 'unknown' | 'not_tracking' | null;
  period_day: number | null;
  symptoms: string[] | null;
  skin_change_noted: boolean | null;
  skin_change_notes: string | null;
  hormonal_treatment: boolean | null;
  hormonal_treatment_notes: string | null;
  confidence: 'high' | 'medium' | 'low' | 'unsure';
  notes: string | null;
  consent_version: string | null;
  created_at: string;
  updated_at: string;
};

export async function upsertCycleLog(date: string, input: Partial<Omit<CycleLog, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'log_date'>>): Promise<CycleLog> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('cycle_logs')
    .upsert({ user_id: user.id, log_date: date, ...input, updated_at: new Date().toISOString() }, { onConflict: 'user_id,log_date' })
    .select().single();
  if (error) throw error;
  return data as CycleLog;
}

export async function fetchCycleLogForDate(date: string): Promise<CycleLog | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('cycle_logs').select('*').eq('user_id', user.id).eq('log_date', date).maybeSingle();
  if (error) throw error;
  return data as CycleLog | null;
}

export async function deleteCycleLog(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase.from('cycle_logs').delete().eq('id', id).eq('user_id', user.id);
  if (error) throw error;
}

// ============================================================
// ROUTINE LOGS
// ============================================================
export type RoutineLog = {
  id: string;
  user_id: string;
  log_date: string;
  routine_slot: 'morning' | 'evening' | 'custom';
  adherence_status: 'completed' | 'partial' | 'skipped' | 'unknown';
  cleansed: boolean | null;
  over_cleansed: boolean | null;
  moisturized: boolean | null;
  sunscreen_applied: boolean | null;
  sunscreen_reapplied: boolean | null;
  makeup_applied: boolean | null;
  makeup_removed: boolean | null;
  exfoliated: boolean | null;
  actives_used: string[] | null;
  product_ids: string[] | null;
  unresolved_products: string[] | null;
  irritation_noted: boolean | null;
  irritation_level: number | null;
  patch_test_active: boolean | null;
  introducing_new: boolean | null;
  routine_changed: boolean | null;
  routine_paused: boolean | null;
  notes: string | null;
  revision: number;
  created_at: string;
  updated_at: string;
};

export async function upsertRoutineLog(date: string, slot: RoutineLog['routine_slot'], input: Partial<Omit<RoutineLog, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'log_date' | 'routine_slot'>>): Promise<RoutineLog> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const existing = await fetchRoutineLogForDateSlot(date, slot);
  const { data, error } = await supabase
    .from('routine_logs')
    .upsert({
      user_id: user.id, log_date: date, routine_slot: slot,
      revision: (existing?.revision ?? 0) + 1,
      ...input,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,log_date,routine_slot' })
    .select().single();
  if (error) throw error;
  return data as RoutineLog;
}

export async function fetchRoutineLogForDateSlot(date: string, slot: string): Promise<RoutineLog | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('routine_logs').select('*').eq('user_id', user.id).eq('log_date', date).eq('routine_slot', slot).maybeSingle();
  if (error) throw error;
  return data as RoutineLog | null;
}

export async function fetchRoutineLogsForDate(date: string): Promise<RoutineLog[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('routine_logs').select('*').eq('user_id', user.id).eq('log_date', date)
    .order('routine_slot', { ascending: true });
  if (error) throw error;
  return (data ?? []) as RoutineLog[];
}

// ============================================================
// HELPERS
// ============================================================
export async function generateEventId(): Promise<string> {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${Date.now()}-${Math.random()}`
  );
}

export const ACTIVITY_TYPES = [
  { id: 'cardio', label: 'Cardio' },
  { id: 'strength', label: 'Strength Training' },
  { id: 'yoga', label: 'Yoga / Stretching' },
  { id: 'sports', label: 'Sports' },
  { id: 'walk', label: 'Walk / Hike' },
  { id: 'swim', label: 'Swimming' },
  { id: 'other', label: 'Other' },
];

export const CONTACT_TYPES = [
  { id: 'pillowcase', label: 'Pillowcase' },
  { id: 'phone', label: 'Phone Screen' },
  { id: 'towel', label: 'Towel' },
  { id: 'mask', label: 'Mask / Respirator' },
  { id: 'helmet_headwear', label: 'Helmet / Headwear' },
  { id: 'hands_touching', label: 'Hands Touching Face' },
  { id: 'picking', label: 'Picking' },
  { id: 'hair_products', label: 'Hair Products' },
  { id: 'shaving', label: 'Shaving' },
  { id: 'friction', label: 'Friction / Pressure' },
  { id: 'other', label: 'Other' },
];

export const CYCLE_PHASES = [
  { id: 'menstrual', label: 'Menstrual' },
  { id: 'follicular', label: 'Follicular' },
  { id: 'ovulation', label: 'Ovulation' },
  { id: 'luteal', label: 'Luteal' },
  { id: 'unknown', label: 'Not Sure' },
  { id: 'not_tracking', label: 'Not Tracking' },
];

export const ACTIVES = [
  { id: 'retinoid', label: 'Retinoid' },
  { id: 'bha', label: 'BHA (Salicylic Acid)' },
  { id: 'bpo', label: 'Benzoyl Peroxide' },
  { id: 'vitamin_c', label: 'Vitamin C' },
  { id: 'niacinamide', label: 'Niacinamide' },
  { id: 'aha', label: 'AHA' },
  { id: 'azelaic_acid', label: 'Azelaic Acid' },
  { id: 'other', label: 'Other' },
];
