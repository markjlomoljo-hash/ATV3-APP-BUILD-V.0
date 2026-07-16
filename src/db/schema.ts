// AcneTrex V3 — Phase 7: Professional Profile & Dermatologist-Ready Reports
//
// This schema implements only the Phase 7 domains: profile aggregation,
// versioned profile sections, consent, reports, exports, and account/data
// deletion. It intentionally includes minimal read-only "source" tables
// (daily_logs, face_atlas_scans, treatment_plans, treatment_checkins,
// trigger_hypotheses, forecast_summaries, treatment_tasks, gamification,
// badges, user_badges,
// weather_snapshots) so that report generation and exports operate on real
// persisted records rather than fabricated data. Those source domains are
// owned by other phases in the full product (FaceAtlas, Treatment Plan
// Center, Gamification, Forecasting, Weather) — here they exist only as
// minimal, honest persistence targets so Phase 7 never has to invent data.
import {
  bigint,
  boolean,
  integer,
  jsonb,
  pgTable,
  pgSchema,
  real,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const id = () =>
  uuid("id").defaultRandom().primaryKey();

const auth = pgSchema("auth");
export const authUsers = auth.table("users", {
  id: uuid("id").primaryKey(),
});

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
  userId: uuid("user_id").notNull().unique().references(() => authUsers.id, { onDelete: "cascade" }),
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
  userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  changes: jsonb("changes").notNull(),
  source: text("source").notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Versioned Professional Profile sections
// ---------------------------------------------------------------------------

export const profileSections = pgTable(
  "profile_sections",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    sectionKey: text("section_key").notNull(),
    valueJson: jsonb("value_json").notNull(),
    version: integer("version").notNull().default(1),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    updatedBy: text("updated_by").notNull().default("user"),
  },
  (table) => [
    uniqueIndex("profile_sections_user_section_key_uidx").on(table.userId, table.sectionKey),
  ],
);

export const profileVersionHistory = pgTable(
  "profile_version_history",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    sectionKey: text("section_key").notNull(),
    version: integer("version").notNull(),
    previousValueJson: jsonb("previous_value_json"),
    newValueJson: jsonb("new_value_json").notNull(),
    changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
    actor: text("actor").notNull().default("user"),
    reason: text("reason"),
    includeInReports: boolean("include_in_reports").notNull().default(true),
  },
  (table) => [
    uniqueIndex("profile_version_history_user_section_version_uidx").on(
      table.userId,
      table.sectionKey,
      table.version,
    ),
  ],
);

export const profileAuditEvents = pgTable("profile_audit_events", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  metadataJson: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Minimal real source-of-truth tables consumed by reports/exports
// ---------------------------------------------------------------------------

export const dailyLogs = pgTable(
  "daily_logs",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    logDate: text("log_date").notNull(), // YYYY-MM-DD
    sleep: jsonb("sleep"),
    food: jsonb("food"),
    stressLevel: integer("stress_level"),
    activity: jsonb("activity"),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [uniqueIndex("daily_logs_user_log_date_uidx").on(table.userId, table.logDate)],
);

export const faceAtlasScans = pgTable("face_atlas_scans", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
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
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  schedule: jsonb("schedule"),
  status: text("status").notNull().default("draft"), // draft | active | paused | completed | abandoned
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  ...timestamps,
});

export const treatmentCheckins = pgTable("treatment_checkins", {
  id: id(),
  planId: uuid("plan_id").notNull().references(() => treatmentPlans.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  checkinDate: text("checkin_date").notNull(),
  status: text("status").notNull(), // used | skipped | delayed | partial | stopped
  irritation: integer("irritation"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const treatmentTasks = pgTable("treatment_tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  planId: uuid("plan_id").notNull().references(() => treatmentPlans.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  taskName: text("task_name").notNull(),
  dueAt: timestamp("due_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  skipped: boolean("skipped").notNull().default(false),
  metadata: jsonb("metadata"),
  ...timestamps,
});

export const triggerHypotheses = pgTable("trigger_hypotheses", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  triggerName: text("trigger_name").notNull(),
  status: text("status").notNull().default("insufficient_data"),
  evidenceCount: integer("evidence_count").notNull().default(0),
  notes: text("notes"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const forecastSummaries = pgTable("forecast_summaries", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  window: text("window").notNull(), // 3d | 7d | 14d | 30d | treatment_cycle
  status: text("status").notNull().default("insufficient_data"),
  summary: text("summary"),
  confidence: text("confidence"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const gamification = pgTable("gamification", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  points: integer("points").notNull().default(0),
  rank: text("rank"),
  petStage: text("pet_stage").notNull().default("seed"),
  petXp: integer("pet_xp").notNull().default(0),
  lastActionAt: timestamp("last_action_at", { withTimezone: true }),
  ...timestamps,
});

export const badges = pgTable("badges", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  icon: text("icon"),
  criteria: jsonb("criteria"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userBadges = pgTable("user_badges", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  badgeId: uuid("badge_id").notNull().references(() => badges.id, { onDelete: "cascade" }),
  earnedAt: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
});

export const weatherSnapshots = pgTable("weather_snapshots", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
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

export const reportRequests = pgTable(
  "report_requests",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    inclusionOptions: jsonb("inclusion_options").notNull(),
    status: text("status").notNull().default("queued"), // queued|processing|completed|failed
    idempotencyKey: text("idempotency_key"),
  },
  (table) => [
    uniqueIndex("report_requests_user_idempotency_uidx").on(table.userId, table.idempotencyKey),
  ],
);

export const reportJobs = pgTable("report_jobs", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  reportRequestId: uuid("report_request_id").notNull().references(() => reportRequests.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("queued"),
  attemptCount: integer("attempt_count").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reportFiles = pgTable("report_files", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  reportRequestId: uuid("report_request_id").notNull().references(() => reportRequests.id, { onDelete: "cascade" }),
  storageRef: text("storage_path").notNull(),
  mimeType: text("mime_type").notNull().default("application/pdf"),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull().default(0),
  checksumSha256: text("checksum_sha256"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

export const reportConsentSnapshots = pgTable("report_consent_snapshots", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  reportRequestId: uuid("report_request_id").notNull().references(() => reportRequests.id, { onDelete: "cascade" }),
  consentJson: jsonb("consent_snapshot").notNull(),
  capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const exportRequests = pgTable("export_requests", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  format: text("format").notNull(), // json | csv
  scope: jsonb("scope").notNull().default({}),
  status: text("status").notNull().default("queued"),
  idempotencyKey: text("idempotency_key"),
  failureReason: text("failure_reason"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
});

export const exportFiles = pgTable("export_files", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  exportRequestId: uuid("export_request_id").notNull().references(() => exportRequests.id, { onDelete: "cascade" }),
  storageRef: text("storage_path").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull().default(0),
  checksumSha256: text("checksum_sha256"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// Account / data deletion
// ---------------------------------------------------------------------------

export const deletionRequests = pgTable("deletion_requests", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  type: text("request_type").notNull(),
  status: text("status").notNull().default("pending"), // pending|scheduled|cancelled|completed
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  scheduledPurgeAt: timestamp("scheduled_purge_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  exportRequestedFirst: boolean("export_requested_first").notNull().default(false),
});

export const deletionAuditEvents = pgTable("deletion_audit_events", {
  id: id(),
  deletionRequestId: uuid("deletion_request_id").notNull().references(() => deletionRequests.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  metadataJson: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
