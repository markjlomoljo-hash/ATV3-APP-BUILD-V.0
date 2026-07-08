// FaceAtlas: scan sessions, private image metadata, annotations, model outputs.
// Raw images are NEVER stored as public URLs — only private object-storage keys.
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./core";

export const REQUIRED_FACE_ATLAS_ANGLES = [
  "front",
  "left_45",
  "right_45",
  "forehead",
  "chin",
] as const;

export const scanSessions = pgTable(
  "scan_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // in_progress | awaiting_processing | processed | insufficient_data | failed | deleted
    status: varchar("status", { length: 32 }).notNull().default("in_progress"),
    capturedAt: timestamp("captured_at", { withTimezone: true }).defaultNow().notNull(),
    // raw images are private-temporary by default unless user grants extended retention
    rawRetentionPolicy: varchar("raw_retention_policy", { length: 32 })
      .notNull()
      .default("temporary"),
    rawImagesDeletedAt: timestamp("raw_images_deleted_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("scan_sessions_user_id_idx").on(t.userId)],
);

export const faceImages = pgTable(
  "face_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scanSessionId: uuid("scan_session_id")
      .notNull()
      .references(() => scanSessions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // one of REQUIRED_FACE_ATLAS_ANGLES
    angle: varchar("angle", { length: 32 }).notNull(),
    // private object-storage key only — never a public URL
    storageKey: text("storage_key").notNull(),
    mimeType: varchar("mime_type", { length: 64 }),
    fileSizeBytes: integer("file_size_bytes"),
    widthPx: integer("width_px"),
    heightPx: integer("height_px"),
    // pending | acceptable | too_dark | too_blurry | wrong_angle | insufficient_data
    qualityStatus: varchar("quality_status", { length: 32 }).notNull().default("pending"),
    qualityMetadata: jsonb("quality_metadata"),
    // pending | extracted | insufficient_data | failed
    derivedFeatureStatus: varchar("derived_feature_status", { length: 32 })
      .notNull()
      .default("pending"),
    isDeleted: boolean("is_deleted").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("face_images_scan_session_id_idx").on(t.scanSessionId),
    index("face_images_user_id_idx").on(t.userId),
  ],
);

export const lesionAnnotations = pgTable(
  "lesion_annotations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    faceImageId: uuid("face_image_id")
      .notNull()
      .references(() => faceImages.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // normalized 0-1 coordinates relative to the image
    xNorm: numeric("x_norm", { precision: 6, scale: 5 }).notNull(),
    yNorm: numeric("y_norm", { precision: 6, scale: 5 }).notNull(),
    lesionType: varchar("lesion_type", { length: 40 }), // papule | pustule | comedone | cyst | scar | other
    userCertainty: varchar("user_certainty", { length: 20 }), // low | medium | high
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("lesion_annotations_face_image_id_idx").on(t.faceImageId)],
);

export const oilinessSelfRatings = pgTable(
  "oiliness_self_ratings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scanSessionId: uuid("scan_session_id")
      .notNull()
      .references(() => scanSessions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    zone: varchar("zone", { length: 32 }), // t_zone | cheeks | chin | overall
    rating: integer("rating").notNull(), // 1-5 user self rating
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("oiliness_self_ratings_scan_session_id_idx").on(t.scanSessionId)],
);

// Model outputs table exists for future ML integration. It must never be
// populated with fabricated values — rows only exist once a real inference
// job has produced a result, otherwise status stays "insufficient_data".
export const faceModelOutputs = pgTable(
  "face_model_outputs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scanSessionId: uuid("scan_session_id")
      .notNull()
      .references(() => scanSessions.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    modelName: varchar("model_name", { length: 80 }),
    modelVersion: varchar("model_version", { length: 40 }),
    // insufficient_data | early_hypothesis | moderate_confidence | high_confidence |
    // needs_confirmation | confounded | calibration_pending
    confidenceLabel: varchar("confidence_label", { length: 40 })
      .notNull()
      .default("insufficient_data"),
    outputPayload: jsonb("output_payload"), // null until a real model produces output
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("face_model_outputs_scan_session_id_idx").on(t.scanSessionId)],
);

export const modelUserDisagreements = pgTable(
  "model_user_disagreements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    faceModelOutputId: uuid("face_model_output_id")
      .notNull()
      .references(() => faceModelOutputs.id, { onDelete: "cascade" }),
    lesionAnnotationId: uuid("lesion_annotation_id").references(() => lesionAnnotations.id, {
      onDelete: "set null",
    }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    description: text("description"),
    // open | acknowledged | reconciled
    status: varchar("status", { length: 20 }).notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("model_user_disagreements_output_idx").on(t.faceModelOutputId)],
);

export const feedbackReconciliations = pgTable(
  "feedback_reconciliations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    modelUserDisagreementId: uuid("model_user_disagreement_id").references(
      () => modelUserDisagreements.id,
      { onDelete: "cascade" },
    ),
    resolutionNotes: text("resolution_notes"),
    resolvedBy: varchar("resolved_by", { length: 40 }), // user | system | reviewer
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
);

export const dbSchemaFaceAtlasMarker = true;
