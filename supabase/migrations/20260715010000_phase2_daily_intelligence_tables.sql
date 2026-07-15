-- Phase 2: Daily Intelligence Tables Migration
-- Session 2 — SkinState, Activity, Hydration, Contact, Routine, Cycle, Points Ledger, Streak Restores

-- ============================================================
-- SKIN STATE LOGS: Daily acne activity journal
-- ============================================================
CREATE TABLE IF NOT EXISTS public.skin_state_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date              DATE NOT NULL,
  -- Overall activity
  overall_activity      TEXT CHECK (overall_activity IN ('none','mild','moderate','severe','unknown')),
  change_from_baseline  TEXT CHECK (change_from_baseline IN ('better','same','worse','unknown')),
  -- Lesion counts (optional, user-entered with uncertainty)
  new_lesions           INTEGER,
  healing_lesions       INTEGER,
  persistent_lesions    INTEGER,
  lesion_count_uncertain BOOLEAN NOT NULL DEFAULT false,
  -- Lesion types
  lesion_types          JSONB, -- {inflammatory:bool, comedonal:bool, nodular_cystic:bool, unsure:bool}
  -- Zones
  dominant_zones        TEXT[], -- ['forehead','chin','cheeks','nose','jawline','neck','back','chest']
  -- Skin conditions
  inflammation_level    INTEGER CHECK (inflammation_level BETWEEN 0 AND 5),
  oiliness_level        INTEGER CHECK (oiliness_level BETWEEN 0 AND 5),
  dryness_level         INTEGER CHECK (dryness_level BETWEEN 0 AND 5),
  -- Symptoms
  sensitivity_symptoms  TEXT[], -- ['tightness','stinging','burning','peeling','itching','tenderness']
  barrier_symptoms      TEXT[], -- ['redness','flaking','rough_texture']
  -- Residual marks
  pih_concern           BOOLEAN,
  scarring_concern      BOOLEAN,
  -- Interpretation (user-selected, not AI-generated)
  interpretation        TEXT CHECK (interpretation IN ('ordinary_breakout','suspected_purging','irritation','no_change','unsure')),
  -- Picking/touching
  picking_touching      BOOLEAN,
  picking_notes         TEXT,
  -- Confidence and notes
  confidence            TEXT CHECK (confidence IN ('high','medium','low','unsure')) DEFAULT 'medium',
  notes                 TEXT,
  -- Revision tracking
  revision              INTEGER NOT NULL DEFAULT 1,
  is_backfill           BOOLEAN NOT NULL DEFAULT false,
  backfill_reason       TEXT,
  -- Timestamps
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Uniqueness: one aggregate record per user per day
  CONSTRAINT skin_state_logs_user_date_unique UNIQUE (user_id, log_date)
);

-- ============================================================
-- ACTIVITY LOGS: Exercise, sweat, and movement
-- ============================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date              DATE NOT NULL,
  event_id              TEXT NOT NULL, -- stable idempotency key per event
  activity_type         TEXT NOT NULL, -- 'cardio','strength','yoga','sports','walk','other'
  start_time            TIMESTAMPTZ,
  duration_minutes      INTEGER,
  intensity             TEXT CHECK (intensity IN ('low','moderate','high','unknown')),
  sweat_amount          TEXT CHECK (sweat_amount IN ('none','light','moderate','heavy','unknown')),
  sweat_context         TEXT,
  occlusion_gear        TEXT[], -- ['helmet','mask','headband','tight_clothing']
  post_workout_cleanse  BOOLEAN,
  post_workout_change   BOOLEAN,
  source                TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','wearable_import')),
  wearable_metadata     JSONB,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Distinct events by stable event_id per user
  CONSTRAINT activity_logs_user_event_unique UNIQUE (user_id, event_id)
);

-- ============================================================
-- HYDRATION LOGS: Daily water intake tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hydration_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date              DATE NOT NULL,
  event_id              TEXT NOT NULL, -- stable idempotency key per entry
  quantity_ml           INTEGER,
  quantity_qualitative  TEXT CHECK (quantity_qualitative IN ('very_low','low','moderate','high','very_high')),
  beverage_type         TEXT, -- 'water','tea','coffee','juice','other'
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT hydration_logs_user_event_unique UNIQUE (user_id, event_id)
);

-- ============================================================
-- CONTACT EVENTS: Pillowcase, phone, picking, occlusion
-- ============================================================
CREATE TABLE IF NOT EXISTS public.contact_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date              DATE NOT NULL,
  event_id              TEXT NOT NULL, -- stable idempotency key
  contact_type          TEXT NOT NULL CHECK (contact_type IN (
    'pillowcase','phone','towel','mask','helmet_headwear',
    'hands_touching','picking','hair_products','shaving',
    'occupational','friction','occlusion','other'
  )),
  frequency             TEXT CHECK (frequency IN ('once','multiple','continuous','unknown')),
  zones_affected        TEXT[],
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT contact_events_user_event_unique UNIQUE (user_id, event_id)
);

-- ============================================================
-- ROUTINE LOGS: Daily skincare routine adherence
-- ============================================================
CREATE TABLE IF NOT EXISTS public.routine_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date              DATE NOT NULL,
  routine_slot          TEXT NOT NULL CHECK (routine_slot IN ('morning','evening','custom')),
  -- Adherence
  adherence_status      TEXT NOT NULL CHECK (adherence_status IN ('completed','partial','skipped','unknown')),
  -- Steps completed
  cleansed              BOOLEAN,
  over_cleansed         BOOLEAN,
  moisturized           BOOLEAN,
  sunscreen_applied     BOOLEAN,
  sunscreen_reapplied   BOOLEAN,
  makeup_applied        BOOLEAN,
  makeup_removed        BOOLEAN,
  exfoliated            BOOLEAN,
  -- Actives used (user-entered)
  actives_used          TEXT[], -- ['retinoid','bha','bpo','vitamin_c','niacinamide','aha','other']
  -- Product references
  product_ids           UUID[],
  unresolved_products   TEXT[], -- manual entries not yet linked to catalog
  -- Tolerance
  irritation_noted      BOOLEAN,
  irritation_level      INTEGER CHECK (irritation_level BETWEEN 0 AND 5),
  -- Patch test / intro state
  patch_test_active     BOOLEAN,
  introducing_new       BOOLEAN,
  -- Events
  routine_changed       BOOLEAN,
  routine_paused        BOOLEAN,
  notes                 TEXT,
  revision              INTEGER NOT NULL DEFAULT 1,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT routine_logs_user_date_slot_unique UNIQUE (user_id, log_date, routine_slot)
);

-- ============================================================
-- CYCLE LOGS: Menstrual/hormonal context (consent-gated)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cycle_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date              DATE NOT NULL,
  -- Phase (user-entered only, no AI inference)
  phase                 TEXT CHECK (phase IN ('menstrual','follicular','ovulation','luteal','unknown','not_tracking')),
  period_day            INTEGER, -- day of period if applicable
  -- Symptoms
  symptoms              TEXT[], -- ['cramps','bloating','mood_changes','skin_changes','other']
  skin_change_noted     BOOLEAN,
  skin_change_notes     TEXT,
  -- Hormonal treatment context
  hormonal_treatment    BOOLEAN,
  hormonal_treatment_notes TEXT,
  -- Uncertainty
  confidence            TEXT CHECK (confidence IN ('high','medium','low','unsure')) DEFAULT 'medium',
  notes                 TEXT,
  -- Consent: this table only stores data when cycle consent is granted
  consent_version       TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cycle_logs_user_date_unique UNIQUE (user_id, log_date)
);

-- ============================================================
-- POINTS LEDGER: Append-only gamification points history
-- ============================================================
CREATE TABLE IF NOT EXISTS public.points_ledger (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idempotency_key       TEXT NOT NULL, -- prevents double-award
  points_delta          INTEGER NOT NULL, -- positive for earn, negative for reversal
  reason                TEXT NOT NULL, -- 'daily_log','treatment_checkin','streak_bonus','badge_award','reversal'
  source_type           TEXT, -- 'skin_log','sleep_log','food_log','treatment','task','streak'
  source_id             TEXT, -- ID of the source record
  balance_after         INTEGER NOT NULL, -- denormalized for audit trail
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT points_ledger_idempotency_unique UNIQUE (user_id, idempotency_key)
);

-- ============================================================
-- STREAK RESTORES: Audit of streak restore usage (max 3/month)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.streak_restores (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restore_date          DATE NOT NULL, -- the date that was restored
  calendar_month        TEXT NOT NULL, -- YYYY-MM for monthly limit enforcement
  points_cost           INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- STRESS LOGS: Extend daily_logs with dedicated stress events
-- ============================================================
CREATE TABLE IF NOT EXISTS public.stress_logs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date              DATE NOT NULL,
  event_id              TEXT NOT NULL,
  intensity             INTEGER NOT NULL CHECK (intensity BETWEEN 0 AND 10),
  intensity_label       TEXT, -- 'none','mild','moderate','high','very_high'
  duration_minutes      INTEGER,
  context_category      TEXT CHECK (context_category IN ('work','relationships','health','financial','academic','other','unknown')),
  coping_context        TEXT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT stress_logs_user_event_unique UNIQUE (user_id, event_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.skin_state_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hydration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycle_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streak_restores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stress_logs ENABLE ROW LEVEL SECURITY;

-- Skin state logs policies
CREATE POLICY "Users can read own skin_state_logs" ON public.skin_state_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own skin_state_logs" ON public.skin_state_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own skin_state_logs" ON public.skin_state_logs
  FOR UPDATE USING (auth.uid() = user_id);

-- Activity logs policies
CREATE POLICY "Users can read own activity_logs" ON public.activity_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activity_logs" ON public.activity_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own activity_logs" ON public.activity_logs
  FOR UPDATE USING (auth.uid() = user_id);

-- Hydration logs policies
CREATE POLICY "Users can read own hydration_logs" ON public.hydration_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own hydration_logs" ON public.hydration_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Contact events policies
CREATE POLICY "Users can read own contact_events" ON public.contact_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contact_events" ON public.contact_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Routine logs policies
CREATE POLICY "Users can read own routine_logs" ON public.routine_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own routine_logs" ON public.routine_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own routine_logs" ON public.routine_logs
  FOR UPDATE USING (auth.uid() = user_id);

-- Cycle logs policies (consent-gated at application layer)
CREATE POLICY "Users can read own cycle_logs" ON public.cycle_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cycle_logs" ON public.cycle_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cycle_logs" ON public.cycle_logs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cycle_logs" ON public.cycle_logs
  FOR DELETE USING (auth.uid() = user_id);

-- Points ledger policies (read-only for users; inserts via service)
CREATE POLICY "Users can read own points_ledger" ON public.points_ledger
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own points_ledger" ON public.points_ledger
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Streak restores policies
CREATE POLICY "Users can read own streak_restores" ON public.streak_restores
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own streak_restores" ON public.streak_restores
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Stress logs policies
CREATE POLICY "Users can read own stress_logs" ON public.stress_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own stress_logs" ON public.stress_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own stress_logs" ON public.stress_logs
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_skin_state_logs_user_date ON public.skin_state_logs (user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_date ON public.activity_logs (user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_hydration_logs_user_date ON public.hydration_logs (user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_contact_events_user_date ON public.contact_events (user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_routine_logs_user_date ON public.routine_logs (user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_cycle_logs_user_date ON public.cycle_logs (user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_points_ledger_user ON public.points_ledger (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_streak_restores_user_month ON public.streak_restores (user_id, calendar_month);
CREATE INDEX IF NOT EXISTS idx_stress_logs_user_date ON public.stress_logs (user_id, log_date DESC);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER skin_state_logs_updated_at BEFORE UPDATE ON public.skin_state_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER activity_logs_updated_at BEFORE UPDATE ON public.activity_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER routine_logs_updated_at BEFORE UPDATE ON public.routine_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER cycle_logs_updated_at BEFORE UPDATE ON public.cycle_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
