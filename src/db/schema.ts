// AcneTrex V3 — Phase 6: Gamification & Treatment Plan Center
//
// This schema is intentionally self-contained because the sandbox repository
// only contains the bare Next.js + Drizzle starter (no Phase 1-5 tables were
// present). To keep Phase 6 real and testable we added minimal, honestly
// modeled stand-ins for the upstream modules that Phase 6 depends on
// (auth/users, SleepDerm, DermDiet/food logs, FaceAtlas scans, consent
// review). These stand-ins are clearly namespaced and documented in
// docs/phase6/ARCHITECTURE_NOTES.md as integration points for the real
// modules built in other phases.
//
// Table -> PRD entity mapping notes (see ARCHITECTURE_NOTES.md for detail):
// - `tasks` combines PRD `tasks` + `task_assignments` (a task row IS the
//   per-user, per-day assignment created from a `task_templates` row).
// - `treatment_checkins` folds in PRD `treatment_side_effects` and
//   `treatment_tolerance_scores` as structured jsonb/enum fields instead of
//   separate tables, to keep the MVP scope shippable. Documented as a known
//   limitation.
import { randomUUID } from "crypto";
import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const id = () =>
  uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID());

/* -------------------------------------------------------------------------
 * Auth (minimal, real — required so every record has true ownership)
 * ---------------------------------------------------------------------- */

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name"),
  timezone: text("timezone").notNull().default("UTC"),
  mealFrequencyBaseline: integer("meal_frequency_baseline").notNull().default(3),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const consentReviews = pgTable("consent_reviews", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  version: text("version").notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------------------------------------------------
 * Minimal upstream-module stand-ins (integration points for other phases)
 * ---------------------------------------------------------------------- */

export const sleepLogs = pgTable(
  "sleep_logs",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    logDate: date("log_date").notNull(),
    sleepTime: text("sleep_time"),
    wakeTime: text("wake_time"),
    quality: integer("quality"),
    disturbances: text("disturbances"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("sleep_logs_user_date_uq").on(t.userId, t.logDate)],
);

export const foodLogs = pgTable("food_logs", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  logDate: date("log_date").notNull(),
  mealType: text("meal_type").notNull(),
  notes: text("notes"),
  loggedAt: timestamp("logged_at", { withTimezone: true }).notNull().defaultNow(),
});

export const faceScans = pgTable("face_scans", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  scanDate: date("scan_date").notNull(),
  anglesCompleted: jsonb("angles_completed").notNull().default([]),
  annotationComplete: boolean("annotation_complete").notNull().default(false),
  feedbackProvided: boolean("feedback_provided").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------------------------------------------------
 * Task Board / Gamification
 * ---------------------------------------------------------------------- */

export const taskTemplates = pgTable("task_templates", {
  id: text("id").primaryKey(),
  category: text("category").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  reasonTemplate: text("reason_template").notNull(),
  basePoints: integer("base_points").notNull(),
  difficulty: text("difficulty").notNull().default("easy"),
  requiredForStreak: boolean("required_for_streak").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
});

export const tasks = pgTable(
  "tasks",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    templateId: text("template_id").notNull().references(() => taskTemplates.id),
    taskDate: date("task_date").notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    category: text("category").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    reason: text("reason").notNull(),
    points: integer("points").notNull(),
    requiredForStreak: boolean("required_for_streak").notNull().default(true),
    status: text("status").notNull().default("pending"),
    sourceModule: text("source_module").notNull().default("system"),
    relatedPlanId: uuid("related_plan_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("tasks_user_date_dedupe_uq").on(t.userId, t.taskDate, t.dedupeKey)],
);

export const taskCompletions = pgTable("task_completions", {
  id: id(),
  taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientCompletionId: text("client_completion_id").notNull().unique(),
  source: text("source").notNull().default("online"),
  localDate: date("local_date").notNull(),
  pointsAwarded: integer("points_awarded").notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pointsLedger = pgTable("points_ledger", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  taskId: uuid("task_id").references(() => tasks.id, { onDelete: "set null" }),
  points: integer("points").notNull(),
  reason: text("reason").notNull(),
  category: text("category").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dailyTaskSummaries = pgTable(
  "daily_task_summaries",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    localDate: date("local_date").notNull(),
    requiredTotal: integer("required_total").notNull().default(0),
    requiredCompleted: integer("required_completed").notNull().default(0),
    optionalTotal: integer("optional_total").notNull().default(0),
    optionalCompleted: integer("optional_completed").notNull().default(0),
    isFullStreakDay: boolean("is_full_streak_day").notNull().default(false),
    restoredFullStreak: boolean("restored_full_streak").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("daily_task_summaries_user_date_uq").on(t.userId, t.localDate)],
);

export const streaks = pgTable("streaks", {
  id: id(),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastEvaluatedDate: date("last_evaluated_date"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const streakRestores = pgTable(
  "streak_restores",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    restoredForDate: date("restored_for_date").notNull(),
    monthKey: text("month_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("streak_restores_user_date_uq").on(t.userId, t.restoredForDate)],
);

export const badges = pgTable("badges", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  icon: text("icon").notNull(),
});

export const userBadges = pgTable(
  "user_badges",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    badgeId: text("badge_id").notNull().references(() => badges.id),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("user_badges_user_badge_uq").on(t.userId, t.badgeId)],
);

export const ranks = pgTable("ranks", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  minPoints: integer("min_points").notNull(),
  minStreak: integer("min_streak").notNull().default(0),
  sortOrder: integer("sort_order").notNull(),
});

export const userRankHistory = pgTable("user_rank_history", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rankId: text("rank_id").notNull().references(() => ranks.id),
  achievedAt: timestamp("achieved_at", { withTimezone: true }).notNull().defaultNow(),
});

export const petState = pgTable("pet_state", {
  id: id(),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  stageIndex: integer("stage_index").notNull().default(0),
  stageCode: text("stage_code").notNull().default("seed_signal"),
  growthScore: integer("growth_score").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aiReadinessEvents = pgTable("ai_readiness_events", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  module: text("module").notNull(),
  delta: integer("delta").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------------------------------------------------
 * Treatment Plan Center
 * ---------------------------------------------------------------------- */

export const treatmentPlans = pgTable("treatment_plans", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  brand: text("brand"),
  activeIngredient: text("active_ingredient").notNull(),
  strength: text("strength"),
  vehicleForm: text("vehicle_form"),
  route: text("route").notNull().default("topical"),
  targetZones: jsonb("target_zones").notNull().default([]),
  sourceType: text("source_type").notNull(),
  prescriptionStatus: text("prescription_status").notNull().default("not_prescription"),
  providerName: text("provider_name"),
  providerInstructions: text("provider_instructions"),
  baselineTolerance: jsonb("baseline_tolerance"),
  scheduleStrategy: jsonb("schedule_strategy").notNull(),
  escalationRules: jsonb("escalation_rules"),
  startDate: date("start_date").notNull(),
  reviewDate: date("review_date"),
  status: text("status").notNull().default("active"),
  safetyFlags: jsonb("safety_flags").notNull().default([]),
  confidence: text("confidence").notNull().default("insufficient_data"),
  evidenceSummary: text("evidence_summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const treatmentScheduleDays = pgTable(
  "treatment_schedule_days",
  {
    id: id(),
    planId: uuid("plan_id").notNull().references(() => treatmentPlans.id, { onDelete: "cascade" }),
    scheduledDate: date("scheduled_date").notNull(),
    dayType: text("day_type").notNull(),
    instructions: text("instructions"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("treatment_schedule_days_plan_date_uq").on(t.planId, t.scheduledDate)],
);

export const treatmentEvents = pgTable("treatment_events", {
  id: id(),
  planId: uuid("plan_id").notNull().references(() => treatmentPlans.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  eventDate: date("event_date").notNull(),
  eventType: text("event_type").notNull(),
  clientEventId: text("client_event_id").notNull().unique(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const treatmentCheckins = pgTable(
  "treatment_checkins",
  {
    id: id(),
    planId: uuid("plan_id").notNull().references(() => treatmentPlans.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    checkinDate: date("checkin_date").notNull(),
    clientCheckinId: text("client_checkin_id").notNull().unique(),
    usageStatus: text("usage_status").notNull(),
    irritationLevel: text("irritation_level").notNull().default("none"),
    barrierSymptoms: jsonb("barrier_symptoms").notNull().default([]),
    acneChange: text("acne_change"),
    sideEffects: jsonb("side_effects").notNull().default([]),
    sunscreenUsed: boolean("sunscreen_used"),
    conflictingActives: jsonb("conflicting_actives").notNull().default([]),
    toleranceScore: integer("tolerance_score"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("treatment_checkins_plan_date_uq").on(t.planId, t.checkinDate)],
);

export const treatmentSafetyFlags = pgTable("treatment_safety_flags", {
  id: id(),
  planId: uuid("plan_id").notNull().references(() => treatmentPlans.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  flagType: text("flag_type").notNull(),
  severity: text("severity").notNull(),
  message: text("message").notNull(),
  requiresProviderContact: boolean("requires_provider_contact").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const treatmentPlanStatusHistory = pgTable("treatment_plan_status_history", {
  id: id(),
  planId: uuid("plan_id").notNull().references(() => treatmentPlans.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  reason: text("reason"),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const treatmentReminders = pgTable("treatment_reminders", {
  id: id(),
  planId: uuid("plan_id").notNull().references(() => treatmentPlans.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  timeOfDay: text("time_of_day").notNull(),
  frequency: text("frequency").notNull().default("daily"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const treatmentConflicts = pgTable("treatment_conflicts", {
  id: id(),
  planId: uuid("plan_id").notNull().references(() => treatmentPlans.id, { onDelete: "cascade" }),
  conflictingPlanId: uuid("conflicting_plan_id").notNull().references(() => treatmentPlans.id, { onDelete: "cascade" }),
  conflictType: text("conflict_type").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
