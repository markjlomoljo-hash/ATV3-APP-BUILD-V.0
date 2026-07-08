// Profile, onboarding, and consent domain.
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./core";

export const profiles = pgTable("profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  dateOfBirth: timestamp("date_of_birth", { withTimezone: true }),
  biologicalSex: varchar("biological_sex", { length: 32 }),
  skinType: varchar("skin_type", { length: 32 }), // oily | dry | combination | normal | unknown
  sensitivity: varchar("sensitivity", { length: 32 }), // low | moderate | high | unknown
  acneHistorySummary: text("acne_history_summary"),
  acneOnsetAge: integer("acne_onset_age"),
  acneSeverityBaseline: varchar("acne_severity_baseline", { length: 32 }),
  medicationHistory: jsonb("medication_history"), // array of {name, startedAt, endedAt, notes}
  allergies: jsonb("allergies"), // array of {substance, reaction, severity}
  currentRoutineSummary: text("current_routine_summary"),
  lifestyleBaseline: jsonb("lifestyle_baseline"), // {sleepHours, stressLevel, diet, exercise, ...}
  goals: jsonb("goals"), // array of strings
  constraints: jsonb("constraints"), // array of strings (budget, sensitivities, time)
  notificationPreferences: jsonb("notification_preferences"),
  privacyPreferences: jsonb("privacy_preferences"),
  onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Versioned history for clinically important profile fields.
export const profileHistory = pgTable(
  "profile_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fieldName: varchar("field_name", { length: 120 }).notNull(),
    previousValue: jsonb("previous_value"),
    newValue: jsonb("new_value"),
    changedAt: timestamp("changed_at", { withTimezone: true }).defaultNow().notNull(),
    source: varchar("source", { length: 80 }), // onboarding | settings | provider_update
  },
  (t) => [index("profile_history_user_id_idx").on(t.userId)],
);

export const onboardingProgress = pgTable(
  "onboarding_progress",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    currentStep: varchar("current_step", { length: 80 }).notNull().default("welcome"),
    completedSteps: jsonb("completed_steps").notNull().default([]),
    isComplete: boolean("is_complete").notNull().default(false),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
);

// ---------------------------------------------------------------------------
// Consent & privacy
// ---------------------------------------------------------------------------

export const consents = pgTable(
  "consents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // terms | privacy_policy | health_data_processing | ai_non_diagnostic |
    // camera_media_education | notification_education | anonymous_network_learning |
    // derived_feature_learning | raw_image_model_improvement | marketing_communications
    consentType: varchar("consent_type", { length: 64 }).notNull(),
    // granted | denied | revoked
    status: varchar("status", { length: 20 }).notNull(),
    version: varchar("version", { length: 20 }).notNull(),
    sourceScreen: varchar("source_screen", { length: 120 }),
    grantedAt: timestamp("granted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("consents_user_id_idx").on(t.userId),
    index("consents_user_type_idx").on(t.userId, t.consentType),
  ],
);

export const dbSchemaProfileMarker = true;
void text;
