/**
 * Treatment Plan Service — protocol builder, check-in, adherence tracking
 * Schema: treatment_plans (uuid user_id), treatment_checkins (text user_id), treatment_tasks (uuid user_id)
 * NOTE: treatment_checkins uses text user_id, treatment_plans/tasks use uuid user_id
 */
import { supabase } from './supabase';

// ============================================================
// TYPES
// ============================================================
export type TreatmentPlan = {
  id: string; // uuid
  user_id: string; // uuid
  title: string;
  description: string | null;
  schedule: TreatmentSchedule;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  adherence_pct: number;
  safety_flags: SafetyFlag[];
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TreatmentSchedule = {
  slots: ScheduleSlot[];
  frequency: 'daily' | 'twice_daily' | 'weekly' | 'as_needed' | 'custom';
  notes?: string;
};

export type ScheduleSlot = {
  time: 'morning' | 'evening' | 'midday' | 'night' | 'custom';
  steps: TreatmentStep[];
};

export type TreatmentStep = {
  id: string;
  name: string;
  product?: string;
  instructions?: string;
  duration_minutes?: number;
  required: boolean;
};

export type SafetyFlag = {
  type: 'interaction' | 'overuse' | 'irritation' | 'contraindication' | 'note';
  message: string;
  severity: 'low' | 'medium' | 'high';
  created_at: string;
};

export type TreatmentCheckin = {
  id: string; // text
  plan_id: string; // text
  user_id: string; // text
  checkin_date: string; // YYYY-MM-DD
  status: 'completed' | 'partial' | 'skipped' | 'missed';
  irritation: number | null; // 0-10
  notes: string | null;
  created_at: string;
};

export type TreatmentTask = {
  id: string; // uuid
  plan_id: string; // uuid
  user_id: string; // uuid
  task_name: string;
  due_at: string | null;
  completed_at: string | null;
  skipped: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

// ============================================================
// TREATMENT PLANS
// ============================================================
export async function fetchTreatmentPlans(): Promise<TreatmentPlan[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('treatment_plans')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as TreatmentPlan[];
}

export async function fetchActiveTreatmentPlan(): Promise<TreatmentPlan | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('treatment_plans')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as TreatmentPlan | null;
}

export async function createTreatmentPlan(input: {
  title: string;
  description?: string;
  schedule: TreatmentSchedule;
}): Promise<TreatmentPlan> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('treatment_plans')
    .insert({
      user_id: user.id,
      title: input.title,
      description: input.description ?? null,
      schedule: input.schedule,
      status: 'active',
      adherence_pct: 0,
      safety_flags: [],
    })
    .select()
    .single();

  if (error) throw error;
  return data as TreatmentPlan;
}

export async function updateTreatmentPlan(id: string, updates: Partial<Pick<TreatmentPlan, 'title' | 'description' | 'schedule' | 'status' | 'safety_flags'>>): Promise<TreatmentPlan> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('treatment_plans')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data as TreatmentPlan;
}

export async function deleteTreatmentPlan(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('treatment_plans')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}

// ============================================================
// TREATMENT CHECKINS (user_id is TEXT in this table)
// ============================================================
export async function fetchCheckinForDate(planId: string, date: string): Promise<TreatmentCheckin | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('treatment_checkins')
    .select('*')
    .eq('user_id', user.id)
    .eq('plan_id', planId)
    .eq('checkin_date', date)
    .maybeSingle();

  if (error) throw error;
  return data as TreatmentCheckin | null;
}

export async function fetchCheckinHistory(planId: string, limit = 30): Promise<TreatmentCheckin[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('treatment_checkins')
    .select('*')
    .eq('user_id', user.id)
    .eq('plan_id', planId)
    .order('checkin_date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as TreatmentCheckin[];
}

export async function upsertCheckin(
  planId: string,
  date: string,
  input: { status: TreatmentCheckin['status']; irritation?: number | null; notes?: string | null }
): Promise<TreatmentCheckin> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // treatment_checkins uses text user_id
  const { data, error } = await supabase
    .from('treatment_checkins')
    .upsert({
      plan_id: planId,
      user_id: user.id,
      checkin_date: date,
      status: input.status,
      irritation: input.irritation ?? null,
      notes: input.notes ?? null,
    }, { onConflict: 'plan_id,user_id,checkin_date' })
    .select()
    .single();

  if (error) throw error;

  // Recompute adherence
  await recomputeAdherence(planId);

  return data as TreatmentCheckin;
}

/**
 * Recompute adherence percentage from real checkin records
 * Rule: adherence = completed / (completed + partial*0.5 + skipped + missed) over last 30 days
 */
async function recomputeAdherence(planId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data } = await supabase
    .from('treatment_checkins')
    .select('status')
    .eq('user_id', user.id)
    .eq('plan_id', planId)
    .order('checkin_date', { ascending: false })
    .limit(30);

  if (!data || data.length === 0) return;

  const total = data.length;
  const score = data.reduce((acc: number, c: { status: string }) => {
    if (c.status === 'completed') return acc + 1;
    if (c.status === 'partial') return acc + 0.5;
    return acc;
  }, 0);

  const pct = Math.round((score / total) * 100);

  await supabase
    .from('treatment_plans')
    .update({ adherence_pct: pct, updated_at: new Date().toISOString() })
    .eq('id', planId)
    .eq('user_id', user.id);
}

// ============================================================
// TREATMENT TASKS
// ============================================================
export async function fetchTasksForPlan(planId: string): Promise<TreatmentTask[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('treatment_tasks')
    .select('*')
    .eq('user_id', user.id)
    .eq('plan_id', planId)
    .order('due_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as TreatmentTask[];
}

export async function completeTask(taskId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('treatment_tasks')
    .update({ completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function skipTask(taskId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('treatment_tasks')
    .update({ skipped: true, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('user_id', user.id);

  if (error) throw error;
}

// ============================================================
// CONSTANTS
// ============================================================
export const COMMON_TREATMENTS = [
  { id: 'bpo_wash', name: 'Benzoyl Peroxide Wash', category: 'cleanser' },
  { id: 'sa_toner', name: 'Salicylic Acid Toner', category: 'toner' },
  { id: 'niacinamide', name: 'Niacinamide Serum', category: 'serum' },
  { id: 'retinoid', name: 'Retinoid / Retinol', category: 'treatment' },
  { id: 'azelaic', name: 'Azelaic Acid', category: 'treatment' },
  { id: 'moisturizer', name: 'Non-comedogenic Moisturizer', category: 'moisturizer' },
  { id: 'spf', name: 'Sunscreen SPF 30+', category: 'sunscreen' },
  { id: 'spot_treatment', name: 'Spot Treatment', category: 'treatment' },
  { id: 'prescription', name: 'Prescription Topical', category: 'prescription' },
  { id: 'oral_medication', name: 'Oral Medication', category: 'oral' },
  { id: 'custom', name: 'Custom Step', category: 'custom' },
];

export const STATUS_COLORS: Record<TreatmentCheckin['status'], string> = {
  completed: '#4CAF50',
  partial: '#FF9800',
  skipped: '#9E9E9E',
  missed: '#F44336',
};

export const STATUS_LABELS: Record<TreatmentCheckin['status'], string> = {
  completed: 'Completed',
  partial: 'Partial',
  skipped: 'Skipped',
  missed: 'Missed',
};
