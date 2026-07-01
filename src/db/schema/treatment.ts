// Treatment plan foundation. The app organizes and tracks treatments; it does
// not prescribe or change medications without provider confirmation.
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./core";

export const treatmentPlans = pgTable(
  "treatment_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description"),
    // true only if a licensed provider directed this plan
    providerDirected: boolean("provider_directed").notNull().default(false),
    // draft | active | paused | completed | archived
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("treatment_plans_user_id_idx").on(t.userId)],
);

export const planSchedules = pgTable(
  "plan_schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    treatmentPlanId: uuid("treatment_plan_id")
      .notNull()
      .references(() => treatmentPlans.id, { onDelete: "cascade" }),
    itemName: varchar("item_name", { length: 160 }).notNull(),
    frequency: varchar("frequency", { length: 60 }), // daily | every_other_day | weekly | custom
    timeOfDay: varchar("time_of_day", { length: 20 }),
    dosageInstructions: text("dosage_instructions"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("plan_schedules_treatment_plan_id_idx").on(t.treatmentPlanId)],
);

export const planEvents = pgTable(
  "plan_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    treatmentPlanId: uuid("treatment_plan_id")
      .notNull()
      .references(() => treatmentPlans.id, { onDelete: "cascade" }),
    planScheduleId: uuid("plan_schedule_id").references(() => planSchedules.id, {
      onDelete: "set null",
    }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
    // completed | skipped | missed
    status: varchar("status", { length: 20 }).notNull().default("completed"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("plan_events_treatment_plan_id_idx").on(t.treatmentPlanId)],
);

export const planCheckIns = pgTable(
  "plan_check_ins",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    treatmentPlanId: uuid("treatment_plan_id")
      .notNull()
      .references(() => treatmentPlans.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    toleranceRating: varchar("tolerance_rating", { length: 20 }), // well_tolerated | mild_irritation | severe_irritation
    sideEffects: jsonb("side_effects"), // array of strings
    perceivedProgress: varchar("perceived_progress", { length: 20 }), // worse | no_change | slight_improvement | improved
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("plan_check_ins_treatment_plan_id_idx").on(t.treatmentPlanId)],
);

export const planReminders = pgTable(
  "plan_reminders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    treatmentPlanId: uuid("treatment_plan_id")
      .notNull()
      .references(() => treatmentPlans.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    remindAt: timestamp("remind_at", { withTimezone: true }).notNull(),
    message: text("message"),
    isSent: boolean("is_sent").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("plan_reminders_treatment_plan_id_idx").on(t.treatmentPlanId)],
);

export const dbSchemaTreatmentMarker = true;
