/**
 * DermDiet Service — food logging and baseline-adaptive meal tracking
 * Zero-fabrication: no AI-generated dietary claims
 */
import { supabase } from './supabase';

export type FoodItem = {
  name: string;
  portion?: string;
  category?: string;
  notes?: string;
};

export type FoodLog = {
  id: string;
  user_id: string;
  log_date: string; // YYYY-MM-DD
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';
  is_baseline: boolean;
  items: FoodItem[];
  categories: string[];
  completed: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type FoodLogInput = Omit<FoodLog, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

export const MEAL_TYPES: { key: FoodLog['meal_type']; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snack' },
  { key: 'other', label: 'Other' },
];

export const FOOD_CATEGORIES = [
  { id: 'dairy', label: 'Dairy' },
  { id: 'gluten', label: 'Gluten/Wheat' },
  { id: 'high_gi', label: 'High GI / Sugar' },
  { id: 'processed', label: 'Processed Foods' },
  { id: 'fried', label: 'Fried/Oily' },
  { id: 'spicy', label: 'Spicy' },
  { id: 'alcohol', label: 'Alcohol' },
  { id: 'caffeine', label: 'Caffeine' },
  { id: 'vegetables', label: 'Vegetables' },
  { id: 'fruits', label: 'Fruits' },
  { id: 'protein', label: 'Protein' },
  { id: 'whole_grains', label: 'Whole Grains' },
  { id: 'omega3', label: 'Omega-3 Rich' },
  { id: 'probiotic', label: 'Probiotic/Fermented' },
  { id: 'supplement', label: 'Supplement' },
  { id: 'other', label: 'Other' },
];

/**
 * Fetch all food logs for a specific date
 */
export async function fetchFoodLogsForDate(date: string): Promise<FoodLog[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', user.id)
    .eq('log_date', date)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as FoodLog[];
}

/**
 * Create a new food log entry
 */
export async function createFoodLog(date: string, input: Omit<FoodLogInput, 'log_date'>): Promise<FoodLog> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const payload = {
    user_id: user.id,
    log_date: date,
    ...input,
  };

  const { data, error } = await supabase
    .from('food_logs')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as FoodLog;
}

/**
 * Update an existing food log entry
 */
export async function updateFoodLog(id: string, updates: Partial<FoodLogInput>): Promise<FoodLog> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('food_logs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data as FoodLog;
}

/**
 * Delete a food log entry
 */
export async function deleteFoodLog(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('food_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}

/**
 * Fetch food log history (paginated by date)
 */
export async function fetchFoodHistory(limit = 14, offset = 0): Promise<{ date: string; logs: FoodLog[] }[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', user.id)
    .order('log_date', { ascending: false })
    .order('created_at', { ascending: true })
    .range(offset, offset + (limit * 5) - 1); // rough estimate

  if (error) throw error;

  // Group by date
  const grouped: Record<string, FoodLog[]> = {};
  for (const log of (data ?? []) as FoodLog[]) {
    if (!grouped[log.log_date]) grouped[log.log_date] = [];
    grouped[log.log_date].push(log);
  }

  return Object.entries(grouped)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, limit)
    .map(([date, logs]) => ({ date, logs }));
}

/**
 * Mark a food log as baseline (used for comparison)
 */
export async function markAsBaseline(id: string, isBaseline: boolean): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('food_logs')
    .update({ is_baseline: isBaseline, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}
