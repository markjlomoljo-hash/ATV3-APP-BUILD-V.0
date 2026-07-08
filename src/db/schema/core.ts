// Core domain: users, authentication, sessions, audit logs, background jobs.
// Every table here is durable Postgres storage — no in-memory or mock state.
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Users & auth identities
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  passwordHash: text("password_hash").notNull(),
  displayName: varchar("display_name", { length: 120 }),
  // active | suspended | deactivated | pending_deletion | deleted
  accountStatus: varchar("account_status", { length: 32 })
    .notNull()
    .default("active"),
  role: varchar("role", { length: 32 }).notNull().default("user"),
  deletionRequestedAt: timestamp("deletion_requested_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const authIdentities = pgTable(
  "auth_identities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // password | google | apple | ... (only "password" is implemented today)
    provider: varchar("provider", { length: 32 }).notNull().default("password"),
    providerAccountId: varchar("provider_account_id", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("auth_identities_user_id_idx").on(t.userId)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // opaque, high-entropy token hash (never store raw token)
    tokenHash: varchar("token_hash", { length: 128 }).notNull().unique(),
    userAgent: text("user_agent"),
    ipAddress: varchar("ip_address", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

export const passwordResets = pgTable(
  "password_resets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 128 }).notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
  },
  (t) => [index("password_resets_user_id_idx").on(t.userId)],
);

export const emailVerifications = pgTable(
  "email_verifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 128 }).notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
  },
  (t) => [index("email_verifications_user_id_idx").on(t.userId)],
);

export const loginAudits = pgTable(
  "login_audits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    email: varchar("email", { length: 320 }),
    // success | invalid_credentials | rate_limited | account_locked | error
    outcome: varchar("outcome", { length: 32 }).notNull(),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("login_audits_user_id_idx").on(t.userId)],
);

// ---------------------------------------------------------------------------
// Audit logs (sensitive-action trail across the whole product)
// ---------------------------------------------------------------------------

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    // e.g. consent.revoked, face_atlas.image_deleted, account.deletion_requested
    action: varchar("action", { length: 120 }).notNull(),
    resourceType: varchar("resource_type", { length: 80 }),
    resourceId: uuid("resource_id"),
    ipAddress: varchar("ip_address", { length: 64 }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("audit_logs_user_id_idx").on(t.userId),
    index("audit_logs_action_idx").on(t.action),
  ],
);

// ---------------------------------------------------------------------------
// Background job queue (durable substitute for Redis/Celery in this stack)
// ---------------------------------------------------------------------------

export const jobQueue = pgTable(
  "job_queue",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    // face_atlas_process | ocr_product_analysis | weather_snapshot | forecast_generate
    // skin_twin_simulate | report_generate | data_export | account_deletion | model_retrain
    jobType: varchar("job_type", { length: 64 }).notNull(),
    // queued | running | succeeded | failed | cancelled
    status: varchar("status", { length: 32 }).notNull().default("queued"),
    payload: jsonb("payload"),
    result: jsonb("result"),
    errorMessage: text("error_message"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    runAfter: timestamp("run_after", { withTimezone: true }).defaultNow().notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("job_queue_status_idx").on(t.status),
    index("job_queue_job_type_idx").on(t.jobType),
    index("job_queue_user_id_idx").on(t.userId),
  ],
);

export const dataRetentionMeta = pgTable(
  "data_retention_meta",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    resourceType: varchar("resource_type", { length: 80 }).notNull(),
    resourceId: uuid("resource_id").notNull(),
    // temporary | standard | extended | permanent_until_deletion
    retentionClass: varchar("retention_class", { length: 40 }).notNull().default("standard"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("data_retention_meta_user_id_idx").on(t.userId)],
);

export const deletionRequests = pgTable(
  "deletion_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // account | face_atlas_scan | face_image | export
    scope: varchar("scope", { length: 40 }).notNull(),
    targetId: uuid("target_id"),
    // requested | queued | processing | completed | failed | cancelled
    status: varchar("status", { length: 32 }).notNull().default("requested"),
    reason: text("reason"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("deletion_requests_user_id_idx").on(t.userId)],
);

export const dbSchemaCoreMarker = true;
void boolean;
