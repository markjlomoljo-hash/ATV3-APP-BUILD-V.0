import { z } from "zod";
import { calendarDateSchema } from "@/lib/acnetrex/modules/schemas";

/**
 * Canonical daily-log kinds shared by web and mobile.
 *
 * The persistence targets are the live Supabase tables mobile already writes
 * (apps/mobile/src/lib/daily-logs-service.ts), verified against the live
 * schema:
 *  - sleep      -> public.sleep_logs   (unique (user_id, log_date))
 *  - food       -> public.food_logs    (unique (user_id, log_date); events
 *                  append into meal_events / snack_events jsonb arrays)
 *  - stress     -> public.daily_logs.stress_level (one row per user/day)
 *  - activity, hydration, cycle, contact, routine
 *               -> public.daily_logs.activity jsonb, namespaced per kind so
 *                  kinds never clobber each other and stress/notes columns
 *                  stay mobile-compatible
 *  - skin-state -> public.acne_history (one-row-per-user singleton; severity
 *                  enum mild|moderate|severe, "clear" recorded verbatim in
 *                  self_assessment with severity null — mobile contract)
 *
 * This module is client-safe: zod only, no server imports.
 */

export const DAILY_LOG_KIND_SLUGS = [
  "sleep",
  "food",
  "stress",
  "activity",
  "hydration",
  "cycle",
  "contact",
  "routine",
  "skin-state",
] as const;

export type DailyLogKindSlug = (typeof DAILY_LOG_KIND_SLUGS)[number];

export const dailyLogKindSlugSchema = z.enum(DAILY_LOG_KIND_SLUGS);

const clockTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:MM time");

const notesSchema = z.string().trim().max(2000);

export const sleepLogSchema = z
  .object({
    logDate: calendarDateSchema,
    bedtime: clockTimeSchema.optional(),
    wakeTime: clockTimeSchema.optional(),
    quality: z.number().int().min(1).max(5),
    notes: notesSchema.optional(),
  })
  .refine((value) => (value.bedtime === undefined) === (value.wakeTime === undefined), {
    message: "Provide both bedtime and wake time, or neither",
    path: ["wakeTime"],
  });

export const foodEntryTypes = ["breakfast", "lunch", "dinner", "snack"] as const;
export const foodCategories = [
  "dairy",
  "high_glycemic",
  "processed",
  "sugary_snack",
  "caffeine",
  "balanced_meal",
] as const;

export const foodLogSchema = z.object({
  logDate: calendarDateSchema,
  entryType: z.enum(foodEntryTypes),
  description: z.string().trim().min(1).max(500),
  categories: z.array(z.enum(foodCategories)).max(foodCategories.length).default([]),
  expectedMealCount: z.number().int().min(1).max(3).optional(),
  notes: notesSchema.optional(),
});

export const stressLogSchema = z.object({
  logDate: calendarDateSchema,
  stressLevel: z.number().int().min(1).max(10),
  notes: notesSchema.optional(),
});

export const activityTypes = ["exercise", "sports", "sauna_heat", "outdoor_heat", "manual_labor", "other"] as const;
export const sweatLevels = ["none", "light", "moderate", "heavy"] as const;

export const activityLogSchema = z.object({
  logDate: calendarDateSchema,
  activityType: z.enum(activityTypes),
  durationMinutes: z.number().int().min(1).max(600).optional(),
  sweatLevel: z.enum(sweatLevels),
  cleansedAfterSweat: z.boolean().default(false),
  occlusiveGearWorn: z.boolean().default(false),
  notes: notesSchema.optional(),
});

export const hydrationConsistency = ["below_usual", "usual", "above_usual"] as const;

export const hydrationLogSchema = z.object({
  logDate: calendarDateSchema,
  volumeMl: z.number().int().min(50).max(10000),
  consistency: z.enum(hydrationConsistency).optional(),
  notes: notesSchema.optional(),
});

export const cyclePhases = ["menstrual", "follicular", "ovulatory", "luteal", "unsure"] as const;

export const cycleLogSchema = z.object({
  logDate: calendarDateSchema,
  // Explicit per-submission opt-in: cycle context is optional, consent-scoped
  // data. Submissions without an explicit acknowledgment are rejected.
  consentAcknowledged: z.literal(true),
  phase: z.enum(cyclePhases),
  cycleDay: z.number().int().min(1).max(60).optional(),
  notes: notesSchema.optional(),
});

export const contactExposures = [
  "mask",
  "helmet",
  "chin_strap",
  "phone_screen",
  "pillowcase_unwashed",
  "hands_touching",
  "picking",
  "glasses_pads",
  "headband",
  "other",
] as const;

export const contactLogSchema = z.object({
  logDate: calendarDateSchema,
  exposures: z.array(z.enum(contactExposures)).min(1).max(contactExposures.length),
  durationHours: z.number().min(0).max(24).optional(),
  notes: notesSchema.optional(),
});

export const routineSteps = [
  "cleanser_am",
  "cleanser_pm",
  "moisturizer_am",
  "moisturizer_pm",
  "sunscreen_am",
  "exfoliation",
  "topical_treatment",
  "makeup_removed",
  "none",
] as const;

export const routineLogSchema = z.object({
  logDate: calendarDateSchema,
  stepsCompleted: z.array(z.enum(routineSteps)).min(1).max(routineSteps.length),
  productChangeIntroduced: z.boolean().default(false),
  newProductName: z.string().trim().max(120).optional(),
  notes: notesSchema.optional(),
});

export const skinStateSeverities = ["clear", "mild", "moderate", "severe"] as const;

export const skinStateLogSchema = z.object({
  severity: z.enum(skinStateSeverities),
  notes: notesSchema.optional(),
});

export type SleepLogInput = z.infer<typeof sleepLogSchema>;
export type FoodLogInput = z.infer<typeof foodLogSchema>;
export type StressLogInput = z.infer<typeof stressLogSchema>;
export type ActivityLogInput = z.infer<typeof activityLogSchema>;
export type HydrationLogInput = z.infer<typeof hydrationLogSchema>;
export type CycleLogInput = z.infer<typeof cycleLogSchema>;
export type ContactLogInput = z.infer<typeof contactLogSchema>;
export type RoutineLogInput = z.infer<typeof routineLogSchema>;
export type SkinStateLogInput = z.infer<typeof skinStateLogSchema>;

export type DailyLogInput =
  | SleepLogInput
  | FoodLogInput
  | StressLogInput
  | ActivityLogInput
  | HydrationLogInput
  | CycleLogInput
  | ContactLogInput
  | RoutineLogInput
  | SkinStateLogInput;

export type DailyLogFieldOption = { value: string; label: string };

export type DailyLogField = {
  name: string;
  label: string;
  input: "date" | "time" | "number" | "select" | "multiselect" | "checkbox" | "textarea" | "text";
  required: boolean;
  help: string;
  options?: DailyLogFieldOption[];
  min?: number;
  max?: number;
  placeholder?: string;
};

export type DailyLogTable = "sleep_logs" | "food_logs" | "daily_logs" | "acne_history";

export type DailyLogKindDefinition = {
  slug: DailyLogKindSlug;
  moduleId: string;
  title: string;
  table: DailyLogTable;
  submitLabel: string;
  historyTitle: string;
  /** Honest empty state — shown when zero durable records exist. */
  emptyHistory: string;
  /** skin-state persists to a one-row-per-user singleton, not per-day rows. */
  singleton: boolean;
  fields: DailyLogField[];
  schema: z.ZodType<DailyLogInput>;
};

function options(values: readonly string[]): DailyLogFieldOption[] {
  return values.map((value) => ({ value, label: value.replace(/_/g, " ") }));
}

const logDateField: DailyLogField = {
  name: "logDate",
  label: "Log date",
  input: "date",
  required: true,
  help: "The calendar day this record belongs to.",
};

const notesField: DailyLogField = {
  name: "notes",
  label: "Notes",
  input: "textarea",
  required: false,
  help: "Optional context stored with the record.",
};

export const DAILY_LOG_KINDS: Record<DailyLogKindSlug, DailyLogKindDefinition> = {
  sleep: {
    slug: "sleep",
    moduleId: "sleepderm",
    title: "SleepDerm log",
    table: "sleep_logs",
    submitLabel: "Save sleep log",
    historyTitle: "Sleep logs",
    emptyHistory: "No sleep logs saved for this account yet.",
    singleton: false,
    schema: sleepLogSchema,
    fields: [
      logDateField,
      { name: "bedtime", label: "Bedtime", input: "time", required: false, help: "24-hour local clock time you went to bed." },
      { name: "wakeTime", label: "Wake time", input: "time", required: false, help: "24-hour local clock time you woke up." },
      { name: "quality", label: "Sleep quality (1-5)", input: "number", required: true, min: 1, max: 5, help: "Self-reported quality; not a sleep-stage claim." },
      notesField,
    ],
  },
  food: {
    slug: "food",
    moduleId: "dermdiet",
    title: "DermDiet log",
    table: "food_logs",
    submitLabel: "Save food entry",
    historyTitle: "Food logs",
    emptyHistory: "No food logs saved for this account yet.",
    singleton: false,
    schema: foodLogSchema,
    fields: [
      logDateField,
      { name: "entryType", label: "Entry type", input: "select", required: true, options: options(foodEntryTypes), help: "Snacks append as sub-events of the same day." },
      { name: "description", label: "What was eaten", input: "text", required: true, placeholder: "e.g. oatmeal with milk", help: "Neutral description; no food is judged." },
      { name: "categories", label: "Observed categories", input: "multiselect", required: false, options: options(foodCategories), help: "Used for exposure windows only after enough outcomes exist." },
      { name: "expectedMealCount", label: "Expected meals today (1-3)", input: "number", required: false, min: 1, max: 3, help: "Supports meal-frequency completion tracking." },
      notesField,
    ],
  },
  stress: {
    slug: "stress",
    moduleId: "stress",
    title: "Stress log",
    table: "daily_logs",
    submitLabel: "Save stress log",
    historyTitle: "Stress logs",
    emptyHistory: "No stress logs saved for this account yet.",
    singleton: false,
    schema: stressLogSchema,
    fields: [
      logDateField,
      { name: "stressLevel", label: "Stress level (1-10)", input: "number", required: true, min: 1, max: 10, help: "Self-observed intensity; it is not a clinical score." },
      notesField,
    ],
  },
  activity: {
    slug: "activity",
    moduleId: "activity",
    title: "Activity and SweatFlow log",
    table: "daily_logs",
    submitLabel: "Save activity log",
    historyTitle: "Activity logs",
    emptyHistory: "No activity logs saved for this account yet.",
    singleton: false,
    schema: activityLogSchema,
    fields: [
      logDateField,
      { name: "activityType", label: "Activity type", input: "select", required: true, options: options(activityTypes), help: "The dominant activity for this entry." },
      { name: "durationMinutes", label: "Duration (minutes)", input: "number", required: false, min: 1, max: 600, help: "Approximate duration." },
      { name: "sweatLevel", label: "Sweat level", input: "select", required: true, options: options(sweatLevels), help: "Observed sweat exposure." },
      { name: "cleansedAfterSweat", label: "Cleansed after sweating", input: "checkbox", required: false, help: "Post-activity cleansing context." },
      { name: "occlusiveGearWorn", label: "Occlusive gear worn", input: "checkbox", required: false, help: "Helmet, straps, pads, or other occlusion during activity." },
      notesField,
    ],
  },
  hydration: {
    slug: "hydration",
    moduleId: "hydration",
    title: "Hydration log",
    table: "daily_logs",
    submitLabel: "Save hydration log",
    historyTitle: "Hydration logs",
    emptyHistory: "No hydration logs saved for this account yet.",
    singleton: false,
    schema: hydrationLogSchema,
    fields: [
      logDateField,
      { name: "volumeMl", label: "Fluid intake (ml)", input: "number", required: true, min: 50, max: 10000, help: "A proxy estimate for the day, in millilitres." },
      { name: "consistency", label: "Compared to usual", input: "select", required: false, options: options(hydrationConsistency), help: "Consistency versus your usual intake." },
      notesField,
    ],
  },
  cycle: {
    slug: "cycle",
    moduleId: "cycle",
    title: "CycleSync log",
    table: "daily_logs",
    submitLabel: "Save cycle context",
    historyTitle: "Cycle context records",
    emptyHistory: "No cycle context saved for this account yet.",
    singleton: false,
    schema: cycleLogSchema,
    fields: [
      logDateField,
      { name: "consentAcknowledged", label: "I choose to record optional hormonal-cycle context", input: "checkbox", required: true, help: "Cycle context is optional and consent-scoped. Nothing is saved without this acknowledgment." },
      { name: "phase", label: "Cycle phase", input: "select", required: true, options: options(cyclePhases), help: "Select 'unsure' honestly if unknown — nothing is inferred." },
      { name: "cycleDay", label: "Cycle day", input: "number", required: false, min: 1, max: 60, help: "Optional day within the current cycle." },
      notesField,
    ],
  },
  contact: {
    slug: "contact",
    moduleId: "contact",
    title: "ContactGuard log",
    table: "daily_logs",
    submitLabel: "Save contact exposures",
    historyTitle: "Contact exposure logs",
    emptyHistory: "No contact exposure logs saved for this account yet.",
    singleton: false,
    schema: contactLogSchema,
    fields: [
      logDateField,
      { name: "exposures", label: "Exposures observed", input: "multiselect", required: true, options: options(contactExposures), help: "Mask, helmet, pillowcase, phone, touching, picking, and other occlusion contact." },
      { name: "durationHours", label: "Approximate exposure hours", input: "number", required: false, min: 0, max: 24, help: "Optional combined exposure duration." },
      notesField,
    ],
  },
  routine: {
    slug: "routine",
    moduleId: "routine",
    title: "Routine log",
    table: "daily_logs",
    submitLabel: "Save routine log",
    historyTitle: "Routine logs",
    emptyHistory: "No routine logs saved for this account yet.",
    singleton: false,
    schema: routineLogSchema,
    fields: [
      logDateField,
      { name: "stepsCompleted", label: "Steps completed", input: "multiselect", required: true, options: options(routineSteps), help: "Select 'none' explicitly for a skipped day — honest missingness beats silence." },
      { name: "productChangeIntroduced", label: "New product introduced", input: "checkbox", required: false, help: "Flags a product change for tolerance review." },
      { name: "newProductName", label: "New product name", input: "text", required: false, placeholder: "Optional product label", help: "Only if a new product was introduced." },
      notesField,
    ],
  },
  "skin-state": {
    slug: "skin-state",
    moduleId: "skin-state",
    title: "Skin State Journal",
    table: "acne_history",
    submitLabel: "Save observed skin state",
    historyTitle: "Current recorded skin state",
    emptyHistory: "No skin state has been recorded for this account yet.",
    singleton: true,
    schema: skinStateLogSchema,
    fields: [
      { name: "severity", label: "Observed state", input: "select", required: true, options: options(skinStateSeverities), help: "'Clear' is recorded verbatim as a self-assessment, never coerced into a severity grade." },
      notesField,
    ],
  },
};

export function getDailyLogKind(slug: string): DailyLogKindDefinition | null {
  const parsed = dailyLogKindSlugSchema.safeParse(slug);
  return parsed.success ? DAILY_LOG_KINDS[parsed.data] : null;
}

// ---------------------------------------------------------------------------
// Form value coercion + validation (shared by the client panel and tests)
// ---------------------------------------------------------------------------

export type DailyLogSubmission =
  | { ok: true; payload: DailyLogInput }
  | { ok: false; issues: string[] };

/**
 * Convert raw HTML form values (strings, string arrays, booleans) into the
 * typed payload for a kind and validate it with the kind schema. Empty
 * optional values are dropped so zod optionality applies cleanly.
 */
export function buildDailyLogSubmission(
  slug: DailyLogKindSlug,
  raw: Record<string, unknown>,
): DailyLogSubmission {
  const definition = DAILY_LOG_KINDS[slug];
  const candidate: Record<string, unknown> = {};

  for (const field of definition.fields) {
    const value = raw[field.name];
    if (value === undefined || value === null || value === "") continue;

    if (field.input === "number") {
      const numeric = typeof value === "number" ? value : Number(value);
      if (Number.isNaN(numeric)) {
        return { ok: false, issues: [`${field.label}: enter a number`] };
      }
      candidate[field.name] = numeric;
      continue;
    }

    if (field.input === "checkbox") {
      if (value === true) candidate[field.name] = true;
      else if (value === false && !field.required) candidate[field.name] = false;
      continue;
    }

    if (field.input === "multiselect") {
      if (Array.isArray(value) && value.length > 0) candidate[field.name] = value;
      continue;
    }

    candidate[field.name] = value;
  }

  const parsed = definition.schema.safeParse(candidate);
  if (!parsed.success) {
    const labels = new Map(definition.fields.map((field) => [field.name, field.label]));
    const issues = parsed.error.issues.map((issue) => {
      const key = String(issue.path[0] ?? "");
      return `${labels.get(key) ?? key ?? "Form"}: ${issue.message}`;
    });
    return { ok: false, issues: issues.length > 0 ? issues : ["Invalid submission"] };
  }

  return { ok: true, payload: parsed.data };
}

// ---------------------------------------------------------------------------
// History presentation (pure — testable without a DOM)
// ---------------------------------------------------------------------------

export type DailyLogEntry = {
  id: string;
  kind: DailyLogKindSlug;
  logDate: string | null;
  recordedAt: string | null;
  values: Record<string, unknown>;
  notes: string | null;
};

function asCount(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value.replace(/_/g, " ") : null;
}

function clock(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value.includes("T") && value.length >= 16) return value.slice(11, 16);
  return value;
}

/** One honest display line per persisted entry — derived only from stored values. */
export function summarizeDailyLogEntry(entry: DailyLogEntry): string {
  const values = entry.values;
  switch (entry.kind) {
    case "sleep": {
      const parts = [`quality ${values.quality ?? "not recorded"}/5`];
      const sleepClock = clock(values.sleepTime);
      const wakeClock = clock(values.wakeTime);
      if (sleepClock && wakeClock) {
        parts.push(`window ${sleepClock} to ${wakeClock}`);
      } else {
        parts.push("times not recorded");
      }
      return parts.join(" · ");
    }
    case "food": {
      const meals = asCount(values.mealEvents);
      const snacks = asCount(values.snackEvents);
      return `${meals} meal event${meals === 1 ? "" : "s"} · ${snacks} snack event${snacks === 1 ? "" : "s"}`;
    }
    case "stress":
      return `stress ${values.stressLevel ?? "not recorded"}/10`;
    case "activity": {
      const parts = [text(values.activityType) ?? "activity"];
      if (typeof values.durationMinutes === "number") parts.push(`${values.durationMinutes} min`);
      parts.push(`sweat ${text(values.sweatLevel) ?? "not recorded"}`);
      return parts.join(" · ");
    }
    case "hydration": {
      const parts = [typeof values.volumeMl === "number" ? `${values.volumeMl} ml` : "volume not recorded"];
      const consistency = text(values.consistency);
      if (consistency) parts.push(consistency);
      return parts.join(" · ");
    }
    case "cycle": {
      const parts = [`phase ${text(values.phase) ?? "not recorded"}`];
      if (typeof values.cycleDay === "number") parts.push(`day ${values.cycleDay}`);
      return parts.join(" · ");
    }
    case "contact": {
      const exposures = Array.isArray(values.exposures)
        ? values.exposures.map((item) => text(item) ?? String(item)).join(", ")
        : "none recorded";
      return `exposures: ${exposures}`;
    }
    case "routine": {
      const steps = Array.isArray(values.stepsCompleted)
        ? values.stepsCompleted.map((item) => text(item) ?? String(item)).join(", ")
        : "none recorded";
      return `steps: ${steps}${values.productChangeIntroduced === true ? " · new product introduced" : ""}`;
    }
    case "skin-state": {
      const observed = text(values.selfAssessment) ?? "not recorded";
      return `observed state: ${observed}`;
    }
  }
}
