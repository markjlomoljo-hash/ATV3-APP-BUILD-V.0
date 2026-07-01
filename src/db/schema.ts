// AcneTrex V3 — Phase 7: Professional Profile & Dermatologist-Ready Reports
//
// This schema implements only the Phase 7 domains: profile aggregation,
// versioned profile sections, consent, reports, exports, and account/data
// deletion. It intentionally includes minimal read-only "source" tables
// (daily_logs, face_atlas_scans, treatment_plans, treatment_checkins,
// trigger_hypotheses, forecast_summaries, tasks, streak_state, badges,
// weather_snapshots) so that report generation and exports operate on real
// persisted records rather than fabricated data. Those source domains are
// owned by other phases in the full product (FaceAtlas, Treatment Plan
// Center, Gamification, Forecasting, Weather) — here they exist only as
// minimal, honest persistence targets so Phase 7 never has to invent data.
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { randomUUID } from "crypto";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => randomUUID());

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Consent & privacy
// ---------------------------------------------------------------------------

export const consentSettings = pgTable("consent_settings", {
  id: id(),
  userId: text("user_id").notNull().unique(),
  anonymousLearning: boolean("anonymous_learning").notNull().default(false),
  rawImageLearning: boolean("raw_image_learning").notNull().default(false),
  includeFaceAtlasPhotosInReports: boolean("include_faceatlas_photos_in_reports")
    .notNull()
    .default(false),
  includeTreatmentDetailsInReports: boolean("include_treatment_details_in_reports")
    .notNull()
    .default(true),
  marketingNotifications: boolean("marketing_notifications").notNull().default(false),
  productAnalysisNotifications: boolean("product_analysis_notifications")
    .notNull()
    .default(true),
  reportReadyNotifications: boolean("report_ready_notifications").notNull().default(true),
  streakRiskNotifications: boolean("streak_risk_notifications").notNull().default(true),
  weatherAlertNotifications: boolean("weather_alert_notifications").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const consentAuditEvents = pgTable("consent_audit_events", {
  id: id(),
  userId: text("user_id").notNull(),
  changes: jsonb("changes").notNull(),
  source: text("source").notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Versioned Professional Profile sections
// ---------------------------------------------------------------------------

export const profileSections = pgTable("profile_sections", {
  id: id(),
  userId: text("user_id").notNull(),
  sectionKey: text("section_key").notNull(),
  valueJson: jsonb("value_json").notNull(),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by").notNull().default("user"),
});

export const profileVersionHistory = pgTable("profile_version_history", {
  id: id(),
  userId: text("user_id").notNull(),
  sectionKey: text("section_key").notNull(),
  version: integer("version").notNull(),
  previousValueJson: jsonb("previous_value_json"),
  newValueJson: jsonb("new_value_json").notNull(),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  actor: text("actor").notNull().default("user"),
  reason: text("reason"),
  includeInReports: boolean("include_in_reports").notNull().default(true),
});

export const profileAuditEvents = pgTable("profile_audit_events", {
  id: id(),
  userId: text("user_id").notNull(),
  eventType: text("event_type").notNull(),
  metadataJson: jsonb("metadata_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Minimal real source-of-truth tables consumed by reports/exports
// ---------------------------------------------------------------------------

export const dailyLogs = pgTable("daily_logs", {
  id: id(),
  userId: text("user_id").notNull(),
  logDate: text("log_date").notNull(), // YYYY-MM-DD
  sleep: jsonb("sleep"),
  food: jsonb("food"),
  stressLevel: integer("stress_level"),
  activity: jsonb("activity"),
  notes: text("notes"),
  ...timestamps,
});

export const faceAtlasScans = pgTable("face_atlas_scans", {
  id: id(),
  userId: text("user_id").notNull(),
  scanDate: timestamp("scan_date", { withTimezone: true }).notNull().defaultNow(),
  angles: jsonb("angles").notNull(),
  userLesionCount: integer("user_lesion_count"),
  modelLesionCount: integer("model_lesion_count"),
  agreementPct: real("agreement_pct"),
  oilinessUser: integer("oiliness_user"),
  oilinessModel: integer("oiliness_model"),
  confidence: text("confidence").notNull().default("insufficient_data"),
  imageStorageRef: text("image_storage_ref"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const treatmentPlans = pgTable("treatment_plans", {
  id: id(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  activeIngredient: text("active_ingredient"),
  status: text("status").notNull().default("active"), // active | archived
  startDate: text("start_date").notNull(),
  reviewDate: text("review_date"),
  instructions: text("instructions"),
  providerDirected: boolean("provider_directed").notNull().default(false),
  ...timestamps,
});

export const treatmentCheckins = pgTable("treatment_checkins", {
  id: id(),
  planId: text("plan_id").notNull(),
  userId: text("user_id").notNull(),
  checkinDate: text("checkin_date").notNull(),
  status: text("status").notNull(), // used | skipped | delayed | partial | stopped
  irritation: integer("irritation"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const triggerHypotheses = pgTable("trigger_hypotheses", {
  id: id(),
  userId: text("user_id").notNull(),
  triggerName: text("trigger_name").notNull(),
  status: text("status").notNull().default("insufficient_data"),
  evidenceCount: integer("evidence_count").notNull().default(0),
  notes: text("notes"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const forecastSummaries = pgTable("forecast_summaries", {
  id: id(),
  userId: text("user_id").notNull(),
  window: text("window").notNull(), // 3d | 7d | 14d | 30d | treatment_cycle
  status: text("status").notNull().default("insufficient_data"),
  summary: text("summary"),
  confidence: text("confidence"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: id(),
  userId: text("user_id").notNull(),
  taskDate: text("task_date").notNull(),
  taskType: text("task_type").notNull(),
  points: integer("points").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const streakState = pgTable("streak_state", {
  id: id(),
  userId: text("user_id").notNull().unique(),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastCompletedDate: text("last_completed_date"),
  restoresUsedThisMonth: integer("restores_used_this_month").notNull().default(0),
  restoreMonth: text("restore_month"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const badges = pgTable("badges", {
  id: id(),
  userId: text("user_id").notNull(),
  badgeKey: text("badge_key").notNull(),
  earnedAt: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
});

export const weatherSnapshots = pgTable("weather_snapshots", {
  id: id(),
  userId: text("user_id").notNull(),
  capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
  source: text("source").notNull().default("provider"),
  geohash: text("geohash"),
  coarseLocation: text("coarse_location"),
  temperatureC: real("temperature_c"),
  humidityPct: real("humidity_pct"),
  uvIndex: real("uv_index"),
  confidence: text("confidence"),
});

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export const reportRequests = pgTable("report_requests", {
  id: id(),
  userId: text("user_id").notNull(),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  inclusionOptions: jsonb("inclusion_options").notNull(),
  status: text("status").notNull().default("queued"), // queued|processing|completed|failed
  idempotencyKey: text("idempotency_key"),
});

export const reportJobs = pgTable("report_jobs", {
  id: id(),
  reportRequestId: text("report_request_id").notNull(),
  status: text("status").notNull().default("queued"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reportFiles = pgTable("report_files", {
  id: id(),
  reportRequestId: text("report_request_id").notNull(),
  storageRef: text("storage_ref").notNull(),
  mimeType: text("mime_type").notNull().default("application/pdf"),
  sizeBytes: integer("size_bytes").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

export const reportConsentSnapshots = pgTable("report_consent_snapshots", {
  id: id(),
  reportRequestId: text("report_request_id").notNull(),
  consentJson: jsonb("consent_json").notNull(),
  capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const exportRequests = pgTable("export_requests", {
  id: id(),
  userId: text("user_id").notNull(),
  format: text("format").notNull(), // json | csv
  scope: text("scope").notNull(), // profile|logs|scans|treatment_plans|tasks|weather|reports|consents|all
  status: text("status").notNull().default("queued"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
});

export const exportFiles = pgTable("export_files", {
  id: id(),
  exportRequestId: text("export_request_id").notNull(),
  storageRef: text("storage_ref").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// Account / data deletion
// ---------------------------------------------------------------------------

export const deletionRequests = pgTable("deletion_requests", {
  id: id(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(), // account|data|faceatlas_only|logs_only|reports_only
  status: text("status").notNull().default("pending"), // pending|scheduled|cancelled|completed
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  scheduledPurgeAt: timestamp("scheduled_purge_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  exportRequestedFirst: boolean("export_requested_first").notNull().default(false),
});

export const deletionAuditEvents = pgTable("deletion_audit_events", {
  id: id(),
  deletionRequestId: text("deletion_request_id").notNull(),
  userId: text("user_id").notNull(),
  eventType: text("event_type").notNull(),
  metadataJson: jsonb("metadata_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
