import "server-only";

import type { PoolClient } from "pg";
import { z } from "zod";
import { getPool } from "@/db";
import {
  faceAtlasAngleSchema,
  faceAtlasAnnotationSchema,
  lesionTaxonomySchema,
  facialZoneSchema,
} from "@/lib/acnetrex/modules/schemas";

const uuidSchema = z.string().uuid();

export const faceAtlasScanRequestSchema = z.object({
  angle: faceAtlasAngleSchema,
  capturedAt: z.string().datetime().optional(),
  analysisConsent: z.literal(true),
  rawImageRetention: z.boolean().default(false),
  notes: z.string().max(2000).optional(),
});

export const faceAtlasAnnotationRequestSchema = faceAtlasAnnotationSchema.safeExtend({
  source: z.literal("user").default("user"),
});

export type FaceAtlasScanRequest = z.infer<typeof faceAtlasScanRequestSchema>;
export type FaceAtlasAnnotationRequest = z.infer<typeof faceAtlasAnnotationRequestSchema>;

export type FaceAtlasScan = {
  id: string;
  angle: z.infer<typeof faceAtlasAngleSchema>;
  status: string;
  capturedAt: string;
  storagePath: string | null;
  rawImageDeletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FaceAtlasAnnotation = {
  id: string;
  scanId: string;
  lesionType: z.infer<typeof lesionTaxonomySchema>;
  zone: z.infer<typeof facialZoneSchema> | null;
  x: number | null;
  y: number | null;
  w: number | null;
  h: number | null;
  userCertainty: number | null;
  source: "user" | "model";
  notes: string | null;
  createdAt: string;
};

export class FaceAtlasConsentRequiredError extends Error {
  constructor() {
    super("raw_image_retention_consent_required");
    this.name = "FaceAtlasConsentRequiredError";
  }
}

export class FaceAtlasScanNotFoundError extends Error {
  constructor() {
    super("faceatlas_scan_not_found");
    this.name = "FaceAtlasScanNotFoundError";
  }
}

type ScanRow = {
  id: string;
  angle: FaceAtlasScan["angle"];
  status: string;
  capturedAt: string;
  storagePath: string | null;
  rawImageDeletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type AnnotationRow = {
  id: string;
  scanId: string;
  lesionType: FaceAtlasAnnotation["lesionType"];
  zone: FaceAtlasAnnotation["zone"];
  x: number | null;
  y: number | null;
  w: number | null;
  h: number | null;
  userCertainty: number | null;
  source: FaceAtlasAnnotation["source"];
  notes: string | null;
  createdAt: string;
};

function mapScan(row: ScanRow): FaceAtlasScan {
  return row;
}

function mapAnnotation(row: AnnotationRow): FaceAtlasAnnotation {
  return row;
}

async function requireRetentionConsent(client: PoolClient, userId: string, requested: boolean) {
  if (!requested) return;
  const result = await client.query<{ rawImageRetention: boolean }>(
    `select raw_image_retention as "rawImageRetention"
       from public.consents
      where user_id = $1::uuid
      limit 1`,
    [userId],
  );
  if (result.rows[0]?.rawImageRetention !== true) throw new FaceAtlasConsentRequiredError();
}

export async function createFaceAtlasScan(
  client: PoolClient,
  userId: string,
  input: FaceAtlasScanRequest,
): Promise<{ scan: FaceAtlasScan; status: "pending_upload" }> {
  await requireRetentionConsent(client, userId, input.rawImageRetention);
  const inserted = await client.query<ScanRow>(
    `insert into public.face_scans
       (user_id, captured_at, angle, status, notes)
     values ($1::uuid, $2::timestamptz, $3, 'pending_upload', $4)
     returning id, angle, status, captured_at as "capturedAt",
               storage_path as "storagePath", raw_image_deleted_at as "rawImageDeletedAt",
               created_at as "createdAt", updated_at as "updatedAt"`,
    [userId, input.capturedAt ?? new Date().toISOString(), input.angle, input.notes ?? null],
  );
  const row = inserted.rows[0];
  if (!row) throw new Error("faceatlas_scan_insert_missing");
  await client.query(
    `insert into public.audit_logs
       (user_id, actor_type, action, target_table, target_id, metadata)
     values ($1::uuid, 'user', 'faceatlas_scan_created', 'face_scans', $2::uuid, $3::jsonb)`,
    [userId, row.id, JSON.stringify({ angle: input.angle, rawImageRetention: input.rawImageRetention })],
  );
  return { scan: mapScan(row), status: "pending_upload" };
}

export async function createFaceAtlasAnnotation(
  client: PoolClient,
  userId: string,
  input: FaceAtlasAnnotationRequest,
): Promise<FaceAtlasAnnotation> {
  const scan = await client.query<{ id: string }>(
    `select id from public.face_scans where id = $1::uuid and user_id = $2::uuid limit 1`,
    [input.scanId, userId],
  );
  if (!scan.rows[0]) throw new FaceAtlasScanNotFoundError();
  const inserted = await client.query<AnnotationRow>(
    `insert into public.annotations
       (scan_id, user_id, lesion_type, zone, x, y, w, h, source, confidence, notes)
     values ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, 'user', $9, $10)
     returning id, scan_id as "scanId", lesion_type as "lesionType", zone, x, y, w, h,
               confidence as "userCertainty", source, notes, created_at as "createdAt"`,
    [input.scanId, userId, input.lesionType, input.zone, input.x, input.y, input.w ?? null, input.h ?? null, input.userCertainty, input.notes ?? null],
  );
  const row = inserted.rows[0];
  if (!row) throw new Error("faceatlas_annotation_insert_missing");
  await client.query(
    `insert into public.audit_logs
       (user_id, actor_type, action, target_table, target_id, metadata)
     values ($1::uuid, 'user', 'faceatlas_annotation_created', 'annotations', $2::uuid, $3::jsonb)`,
    [userId, row.id, JSON.stringify({ scanId: input.scanId, lesionType: input.lesionType, zone: input.zone })],
  );
  return mapAnnotation(row);
}

export async function listFaceAtlasScans(userId: string): Promise<FaceAtlasScan[]> {
  const result = await getPool().query<ScanRow>(
    `select id, angle, status, captured_at as "capturedAt",
            storage_path as "storagePath", raw_image_deleted_at as "rawImageDeletedAt",
            created_at as "createdAt", updated_at as "updatedAt"
       from public.face_scans
      where user_id = $1::uuid
      order by captured_at desc
      limit 100`,
    [userId],
  );
  return result.rows.map(mapScan);
}

export async function getFaceAtlasScan(
  userId: string,
  scanId: string,
  client?: PoolClient,
): Promise<{ scan: FaceAtlasScan; annotations: FaceAtlasAnnotation[] }> {
  const queryable = client ?? getPool();
  const scanResult = await queryable.query<ScanRow>(
    `select id, angle, status, captured_at as "capturedAt",
            storage_path as "storagePath", raw_image_deleted_at as "rawImageDeletedAt",
            created_at as "createdAt", updated_at as "updatedAt"
       from public.face_scans
      where id = $1::uuid and user_id = $2::uuid
      limit 1`,
    [scanId, userId],
  );
  const scan = scanResult.rows[0];
  if (!scan) throw new FaceAtlasScanNotFoundError();
  const annotations = await queryable.query<AnnotationRow>(
    `select id, scan_id as "scanId", lesion_type as "lesionType", zone, x, y, w, h,
            confidence as "userCertainty", source, notes, created_at as "createdAt"
       from public.annotations
      where scan_id = $1::uuid and user_id = $2::uuid
      order by created_at asc`,
    [scanId, userId],
  );
  return { scan: mapScan(scan), annotations: annotations.rows.map(mapAnnotation) };
}

export { uuidSchema };
