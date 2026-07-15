/**
 * Gamification Service — streaks, XP, badges, points ledger
 * Schema verified from Supabase production
 * All calculations deterministic from real records
 */
import { supabase } from './supabase';

// ============================================================
// TYPES
// ============================================================
export type GamificationRecord = {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  points: number;
  rank: string;
  pet_stage: string;
  pet_xp: number;
  last_action_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Badge = {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  criteria: BadgeCriteria;
  created_at: string;
};

export type BadgeCriteria = {
  type: 'streak' | 'total_logs' | 'treatment_adherence' | 'module_unlock' | 'first_action' | 'custom';
  threshold?: number;
  module?: string;
  description?: string;
};

export type UserBadge = {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  badge?: Badge;
};

export type PointsLedgerEntry = {
  id: string;
  user_id: string;
  idempotency_key: string;
  points_delta: number;
  reason: string;
  source_type: string;
  source_id: string | null;
  balance_after: number;
  created_at: string;
};

export type StreakRestore = {
  id: string;
  user_id: string;
  restore_date: string;
  calendar_month: string;
  points_cost: number;
  created_at: string;
};

// ============================================================
// POINT VALUES (deterministic, documented)
// ============================================================
export const POINT_VALUES = {
  skin_log: 10,
  sleep_log: 8,
  food_log: 6,
  treatment_checkin: 15,
  treatment_checkin_partial: 7,
  context_log: 5,
  streak_bonus_7d: 25,
  streak_bonus_30d: 100,
  streak_bonus_100d: 500,
  onboarding_complete: 50,
} as const;

// ============================================================
// RANK THRESHOLDS (deterministic)
// ============================================================
export const RANKS = [
  { name: 'Newcomer', min: 0, max: 99 },
  { name: 'Observer', min: 100, max: 299 },
  { name: 'Tracker', min: 300, max: 699 },
  { name: 'Analyst', min: 700, max: 1499 },
  { name: 'Expert', min: 1500, max: 2999 },
  { name: 'Master', min: 3000, max: 9999 },
  { name: 'Legend', min: 10000, max: Infinity },
] as const;

export function getRankForPoints(points: number): string {
  return RANKS.find(r => points >= r.min && points <= r.max)?.name ?? 'Newcomer';
}

// ============================================================
// PET STAGES (deterministic)
// ============================================================
export const PET_STAGES = [
  { stage: 'egg', min_xp: 0, label: 'Egg' },
  { stage: 'hatchling', min_xp: 50, label: 'Hatchling' },
  { stage: 'juvenile', min_xp: 200, label: 'Juvenile' },
  { stage: 'adolescent', min_xp: 500, label: 'Adolescent' },
  { stage: 'adult', min_xp: 1000, label: 'Adult' },
  { stage: 'elder', min_xp: 2500, label: 'Elder' },
] as const;

export function getPetStageForXP(xp: number): string {
  const stages = [...PET_STAGES].reverse();
  return stages.find(s => xp >= s.min_xp)?.stage ?? 'egg';
}

// ============================================================
// FETCH GAMIFICATION RECORD
// ============================================================
export async function fetchGamification(): Promise<GamificationRecord | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('gamification')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data as GamificationRecord | null;
}

/**
 * Get or create the gamification record for the current user
 */
export async function getOrCreateGamification(): Promise<GamificationRecord> {
  const existing = await fetchGamification();
  if (existing) return existing;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('gamification')
    .insert({
      user_id: user.id,
      current_streak: 0,
      longest_streak: 0,
      points: 0,
      rank: 'Newcomer',
      pet_stage: 'egg',
      pet_xp: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as GamificationRecord;
}

// ============================================================
// AWARD POINTS (idempotent via idempotency_key)
// ============================================================
export async function awardPoints(
  points: number,
  reason: string,
  sourceType: string,
  sourceId: string | null,
  idempotencyKey: string
): Promise<{ ledger: PointsLedgerEntry; gamification: GamificationRecord }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check idempotency — don't double-award
  const { data: existing } = await supabase
    .from('points_ledger')
    .select('id')
    .eq('user_id', user.id)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (existing) {
    // Already awarded — return current state
    const gamif = await getOrCreateGamification();
    const { data: ledger } = await supabase
      .from('points_ledger')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .single();
    return { ledger: ledger as PointsLedgerEntry, gamification: gamif };
  }

  // Get current balance
  const gamif = await getOrCreateGamification();
  const newBalance = gamif.points + points;
  const newRank = getRankForPoints(newBalance);
  const newPetXP = gamif.pet_xp + Math.floor(points / 2);
  const newPetStage = getPetStageForXP(newPetXP);

  // Insert ledger entry
  const { data: ledger, error: ledgerError } = await supabase
    .from('points_ledger')
    .insert({
      user_id: user.id,
      idempotency_key: idempotencyKey,
      points_delta: points,
      reason,
      source_type: sourceType,
      source_id: sourceId,
      balance_after: newBalance,
    })
    .select()
    .single();

  if (ledgerError) throw ledgerError;

  // Update gamification record
  const { data: updatedGamif, error: gamifError } = await supabase
    .from('gamification')
    .update({
      points: newBalance,
      rank: newRank,
      pet_xp: newPetXP,
      pet_stage: newPetStage,
      last_action_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .select()
    .single();

  if (gamifError) throw gamifError;

  return { ledger: ledger as PointsLedgerEntry, gamification: updatedGamif as GamificationRecord };
}

// ============================================================
// STREAK MANAGEMENT
// ============================================================
/**
 * Increment streak for today.
 * Rule: streak increments if last_action_at was yesterday; resets if gap > 1 day.
 * Idempotent: calling multiple times on same day is safe.
 */
export async function incrementStreak(): Promise<GamificationRecord> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const gamif = await getOrCreateGamification();
  const today = new Date().toISOString().split('T')[0];
  const lastAction = gamif.last_action_at ? gamif.last_action_at.split('T')[0] : null;

  // Already incremented today
  if (lastAction === today) return gamif;

  let newStreak = gamif.current_streak;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (lastAction === yesterdayStr) {
    // Consecutive day
    newStreak = gamif.current_streak + 1;
  } else if (!lastAction) {
    // First ever action
    newStreak = 1;
  } else {
    // Streak broken
    newStreak = 1;
  }

  const newLongest = Math.max(newStreak, gamif.longest_streak);

  const { data, error } = await supabase
    .from('gamification')
    .update({
      current_streak: newStreak,
      longest_streak: newLongest,
      last_action_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data as GamificationRecord;
}

// ============================================================
// BADGES
// ============================================================
export async function fetchAllBadges(): Promise<Badge[]> {
  const { data, error } = await supabase
    .from('badges')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Badge[];
}

export async function fetchUserBadges(): Promise<UserBadge[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('user_badges')
    .select('*, badge:badges(*)')
    .eq('user_id', user.id)
    .order('earned_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as UserBadge[];
}

export async function awardBadge(badgeId: string): Promise<UserBadge | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check if already earned
  const { data: existing } = await supabase
    .from('user_badges')
    .select('id')
    .eq('user_id', user.id)
    .eq('badge_id', badgeId)
    .maybeSingle();

  if (existing) return null; // Already earned

  const { data, error } = await supabase
    .from('user_badges')
    .insert({ user_id: user.id, badge_id: badgeId })
    .select('*, badge:badges(*)')
    .single();

  if (error) throw error;
  return data as UserBadge;
}

// ============================================================
// POINTS LEDGER HISTORY
// ============================================================
export async function fetchPointsHistory(limit = 20): Promise<PointsLedgerEntry[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('points_ledger')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as PointsLedgerEntry[];
}

// ============================================================
// STREAK RESTORE
// ============================================================
export async function restoreStreak(date: string, pointsCost: number): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const gamif = await getOrCreateGamification();
  if (gamif.points < pointsCost) throw new Error('Insufficient points for streak restore');

  const calendarMonth = date.substring(0, 7); // YYYY-MM

  // Check if already restored this month
  const { data: existing } = await supabase
    .from('streak_restores')
    .select('id')
    .eq('user_id', user.id)
    .eq('calendar_month', calendarMonth)
    .maybeSingle();

  if (existing) throw new Error('Streak already restored this month');

  // Deduct points and record restore
  await supabase.from('streak_restores').insert({
    user_id: user.id,
    restore_date: date,
    calendar_month: calendarMonth,
    points_cost: pointsCost,
  });

  await supabase.from('gamification').update({
    points: gamif.points - pointsCost,
    current_streak: gamif.current_streak + 1,
    updated_at: new Date().toISOString(),
  }).eq('user_id', user.id);
}
