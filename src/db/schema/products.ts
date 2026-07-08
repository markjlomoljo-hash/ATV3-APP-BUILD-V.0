// Products, routines, and FormulaLens analysis foundation.
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

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    brand: varchar("brand", { length: 120 }),
    category: varchar("category", { length: 60 }), // cleanser | moisturizer | sunscreen | treatment | makeup | other
    barcode: varchar("barcode", { length: 64 }),
    // barcode | search | manual | ocr_import
    source: varchar("source", { length: 20 }).notNull().default("manual"),
    ingredientListRaw: text("ingredient_list_raw"),
    ingredientList: jsonb("ingredient_list"), // parsed array of ingredient names
    ocrMetadata: jsonb("ocr_metadata"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("products_user_id_idx").on(t.userId)],
);

export const productUsageLogs = pgTable(
  "product_usage_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    usedAt: timestamp("used_at", { withTimezone: true }).defaultNow().notNull(),
    timeOfDay: varchar("time_of_day", { length: 20 }), // morning | evening | asneeded
    amountApplied: varchar("amount_applied", { length: 40 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("product_usage_logs_user_id_idx").on(t.userId)],
);

export const productReactions = pgTable(
  "product_reactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    reactionType: varchar("reaction_type", { length: 60 }), // breakout | irritation | dryness | none | improvement
    severity: varchar("severity", { length: 20 }), // mild | moderate | severe
    onsetHours: text("onset_hours"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("product_reactions_user_id_idx").on(t.userId)],
);

export const routines = pgTable(
  "routines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    timeOfDay: varchar("time_of_day", { length: 20 }).notNull().default("morning"), // morning | evening
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("routines_user_id_idx").on(t.userId)],
);

export const routineSteps = pgTable(
  "routine_steps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    routineId: uuid("routine_id")
      .notNull()
      .references(() => routines.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    stepOrder: varchar("step_order", { length: 8 }).notNull().default("1"),
    instructions: text("instructions"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("routine_steps_routine_id_idx").on(t.routineId)],
);

export const routineConflicts = pgTable(
  "routine_conflicts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productAId: uuid("product_a_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    productBId: uuid("product_b_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    conflictType: varchar("conflict_type", { length: 60 }), // known_interaction | overlapping_actives | insufficient_data
    detail: text("detail"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("routine_conflicts_user_id_idx").on(t.userId)],
);

// FormulaLens: structure for future ingredient-risk analysis. Rows only ever
// contain real computed data; if analysis cannot run, status stays
// "insufficient_data" and findings remain null — never fabricated.
export const formulaLensAnalyses = pgTable(
  "formula_lens_analyses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    // queued | processing | complete | insufficient_data | failed
    status: varchar("status", { length: 32 }).notNull().default("queued"),
    findings: jsonb("findings"),
    modelVersion: varchar("model_version", { length: 40 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("formula_lens_analyses_user_id_idx").on(t.userId)],
);

export const dbSchemaProductsMarker = true;
