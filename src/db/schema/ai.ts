// AI/ML readiness, model registry, inference jobs, and result domains.
// These tables define the contract for future ML integration. No row may be
// populated with fabricated numbers — absence of a real inference means the
// API must surface "insufficient_data", not a placeholder value.
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

export const ALLOWED_CONFIDENCE_LABELS = [
  "insufficient_data",
  "early_hypothesis",
  "moderate_confidence",
  "high_confidence",
  "needs_confirmation",
  "confounded_by_another_change",
  "model_disagrees_with_user_annotation",
  "user_feedback_accepted_for_review",
  "calibration_pending",
] as const;

export const modelRegistry = pgTable("model_registry", {
  id: uuid("id").defaultRandom().primaryKey(),
  modelKey: varchar("model_key", { length: 80 }).notNull(), // trigger_graph | sleep_derm | derm_diet | skin_twin | face_atlas
  version: varchar("version", { length: 40 }).notNull(),
  // not_configured | training | active | deprecated
  status: varchar("status", { length: 20 }).notNull().default("not_configured"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const inferenceJobs = pgTable(
  "inference_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    modelKey: varchar("model_key", { length: 80 }).notNull(),
    // queued | running | complete | insufficient_data | failed
    status: varchar("status", { length: 20 }).notNull().default("queued"),
    inputSummary: jsonb("input_summary"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("inference_jobs_user_id_idx").on(t.userId)],
);

export const aiOutputs = pgTable(
  "ai_outputs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    inferenceJobId: uuid("inference_job_id").references(() => inferenceJobs.id, {
      onDelete: "cascade",
    }),
    outputType: varchar("output_type", { length: 60 }).notNull(),
    confidenceLabel: varchar("confidence_label", { length: 40 })
      .notNull()
      .default("insufficient_data"),
    insufficientDataReason: text("insufficient_data_reason"),
    variableContributions: jsonb("variable_contributions"), // only populated with real computed weights
    payload: jsonb("payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("ai_outputs_user_id_idx").on(t.userId)],
);

export const forecasts = pgTable(
  "forecasts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    forecastFor: timestamp("forecast_for", { withTimezone: true }).notNull(),
    confidenceLabel: varchar("confidence_label", { length: 40 })
      .notNull()
      .default("insufficient_data"),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("forecasts_user_id_idx").on(t.userId)],
);

export const forecastOutcomeFeedback = pgTable(
  "forecast_outcome_feedback",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    forecastId: uuid("forecast_id")
      .notNull()
      .references(() => forecasts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    outcomeReported: text("outcome_reported"),
    matchedPrediction: varchar("matched_prediction", { length: 20 }), // yes | no | partial | unknown
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("forecast_outcome_feedback_forecast_id_idx").on(t.forecastId)],
);

export const triggerGraphEdges = pgTable(
  "trigger_graph_edges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    variableFrom: varchar("variable_from", { length: 60 }).notNull(),
    variableTo: varchar("variable_to", { length: 60 }).notNull(),
    strength: varchar("strength", { length: 20 }), // only set from real computed correlation
    confidenceLabel: varchar("confidence_label", { length: 40 })
      .notNull()
      .default("insufficient_data"),
    sampleSize: varchar("sample_size", { length: 10 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("trigger_graph_edges_user_id_idx").on(t.userId)],
);

export const sleepDermResults = pgTable(
  "sleep_derm_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    windowEnd: timestamp("window_end", { withTimezone: true }).notNull(),
    confidenceLabel: varchar("confidence_label", { length: 40 })
      .notNull()
      .default("insufficient_data"),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("sleep_derm_results_user_id_idx").on(t.userId)],
);

export const dermDietResults = pgTable(
  "derm_diet_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    windowEnd: timestamp("window_end", { withTimezone: true }).notNull(),
    confidenceLabel: varchar("confidence_label", { length: 40 })
      .notNull()
      .default("insufficient_data"),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("derm_diet_results_user_id_idx").on(t.userId)],
);

export const skinTwinSimulations = pgTable(
  "skin_twin_simulations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    scenarioInput: jsonb("scenario_input").notNull(),
    // queued | running | complete | insufficient_data | failed
    status: varchar("status", { length: 20 }).notNull().default("queued"),
    confidenceLabel: varchar("confidence_label", { length: 40 })
      .notNull()
      .default("insufficient_data"),
    resultPayload: jsonb("result_payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("skin_twin_simulations_user_id_idx").on(t.userId)],
);

export const dbSchemaAiMarker = true;
