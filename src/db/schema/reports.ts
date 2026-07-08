// Reports and exports. Report/export files reference private storage keys
// only. Report generation must never backfill missing sections with
// fabricated data — missing sections are marked insufficient_data.
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./core";

export const reportJobs = pgTable(
  "report_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reportType: varchar("report_type", { length: 40 }).notNull().default("dermatologist_ready"),
    // queued | processing | complete | insufficient_data | failed
    status: varchar("status", { length: 20 }).notNull().default("queued"),
    windowStart: timestamp("window_start", { withTimezone: true }),
    windowEnd: timestamp("window_end", { withTimezone: true }),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("report_jobs_user_id_idx").on(t.userId)],
);

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reportJobId: uuid("report_job_id")
      .notNull()
      .references(() => reportJobs.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storageKey: text("storage_key"),
    sectionsIncluded: jsonb("sections_included"), // array of section keys actually populated
    sectionsInsufficientData: jsonb("sections_insufficient_data"), // array of section keys omitted
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("reports_user_id_idx").on(t.userId)],
);

export const exportJobs = pgTable(
  "export_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    exportType: varchar("export_type", { length: 40 }).notNull().default("full_account"),
    // queued | processing | complete | failed
    status: varchar("status", { length: 20 }).notNull().default("queued"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("export_jobs_user_id_idx").on(t.userId)],
);

export const exportFiles = pgTable(
  "export_files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    exportJobId: uuid("export_job_id")
      .notNull()
      .references(() => exportJobs.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    fileFormat: varchar("file_format", { length: 20 }).notNull().default("json"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("export_files_export_job_id_idx").on(t.exportJobId)],
);

export const dbSchemaReportsMarker = true;
