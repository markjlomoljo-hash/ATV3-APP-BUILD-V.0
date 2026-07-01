// Daily logging domain. Same-day entries upsert onto one row per user per day
// where noted (sleep, stress, activity summary, cycle, contact, hydration).
// Food logging supports multiple discrete meal/snack events per day.
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  time,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./core";

export const sleepLogs = pgTable(
  "sleep_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    logDate: date("log_date").notNull(), // the day the sleep is attributed to (wake date)
    sleepStart: timestamp("sleep_start", { withTimezone: true }).notNull(),
    wakeTime: timestamp("wake_time", { withTimezone: true }).notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    quality: varchar("quality", { length: 20 }), // poor | fair | good | excellent
    disturbances: jsonb("disturbances"), // array of strings
    naps: jsonb("naps"), // array of {start, end, durationMinutes}
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("sleep_logs_user_date_idx").on(t.userId, t.logDate),
    unique("sleep_logs_user_date_unique").on(t.userId, t.logDate),
  ],
);

export const foodLogs = pgTable(
  "food_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    logDate: date("log_date").notNull(),
    baselineMealsPerDay: integer("baseline_meals_per_day"),
    // completion state of the daily food log: incomplete | complete | skipped
    completionState: varchar("completion_state", { length: 20 }).notNull().default("incomplete"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("food_logs_user_date_idx").on(t.userId, t.logDate),
    unique("food_logs_user_date_unique").on(t.userId, t.logDate),
  ],
);

export const mealEvents = pgTable(
  "meal_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    foodLogId: uuid("food_log_id")
      .notNull()
      .references(() => foodLogs.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventType: varchar("event_type", { length: 20 }).notNull().default("meal"), // meal | snack
    category: varchar("category", { length: 40 }), // breakfast | lunch | dinner | snack | drink
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    description: text("description"),
    portionSize: varchar("portion_size", { length: 20 }), // small | medium | large
    items: jsonb("items"), // array of {name, quantity}
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("meal_events_food_log_id_idx").on(t.foodLogId)],
);

export const stressLogs = pgTable(
  "stress_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    logDate: date("log_date").notNull(),
    stressLevel: integer("stress_level").notNull(), // 1-10
    triggers: jsonb("triggers"), // array of strings
    copingActions: jsonb("coping_actions"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("stress_logs_user_date_idx").on(t.userId, t.logDate),
    unique("stress_logs_user_date_unique").on(t.userId, t.logDate),
  ],
);

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    logDate: date("log_date").notNull(),
    activityType: varchar("activity_type", { length: 60 }),
    durationMinutes: integer("duration_minutes"),
    intensity: varchar("intensity", { length: 20 }), // light | moderate | vigorous
    sweatLevel: varchar("sweat_level", { length: 20 }), // none | light | moderate | heavy
    postActivityCleansed: boolean("post_activity_cleansed"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("activity_logs_user_date_idx").on(t.userId, t.logDate),
    unique("activity_logs_user_date_unique").on(t.userId, t.logDate),
  ],
);

export const hydrationLogs = pgTable(
  "hydration_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    logDate: date("log_date").notNull(),
    waterMl: integer("water_ml"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("hydration_logs_user_date_idx").on(t.userId, t.logDate),
    unique("hydration_logs_user_date_unique").on(t.userId, t.logDate),
  ],
);

export const cycleLogs = pgTable(
  "cycle_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    logDate: date("log_date").notNull(),
    phase: varchar("phase", { length: 20 }), // menstrual | follicular | ovulation | luteal | unknown
    flow: varchar("flow", { length: 20 }), // none | light | medium | heavy
    symptoms: jsonb("symptoms"), // array of strings
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("cycle_logs_user_date_idx").on(t.userId, t.logDate),
    unique("cycle_logs_user_date_unique").on(t.userId, t.logDate),
  ],
);

export const contactLogs = pgTable(
  "contact_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    logDate: date("log_date").notNull(),
    // helmet | mask | phone | pillowcase | hands | hair_product | other
    contactType: varchar("contact_type", { length: 40 }),
    durationMinutes: integer("duration_minutes"),
    zone: varchar("zone", { length: 40 }), // forehead | cheeks | chin | jawline
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("contact_logs_user_date_idx").on(t.userId, t.logDate)],
);

export const routineAdherenceLogs = pgTable(
  "routine_adherence_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    logDate: date("log_date").notNull(),
    routineId: uuid("routine_id"),
    timeOfDay: varchar("time_of_day", { length: 20 }), // morning | evening
    completed: boolean("completed").notNull().default(false),
    stepsCompleted: jsonb("steps_completed"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("routine_adherence_logs_user_date_idx").on(t.userId, t.logDate),
    unique("routine_adherence_logs_user_date_time_unique").on(t.userId, t.logDate, t.timeOfDay),
  ],
);

export const symptomLogs = pgTable(
  "symptom_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    logDate: date("log_date").notNull(),
    symptomType: varchar("symptom_type", { length: 60 }),
    severity: integer("severity"), // 1-10
    zone: varchar("zone", { length: 40 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("symptom_logs_user_date_idx").on(t.userId, t.logDate)],
);

export const dbSchemaLogsMarker = true;
void time;
void numeric;
