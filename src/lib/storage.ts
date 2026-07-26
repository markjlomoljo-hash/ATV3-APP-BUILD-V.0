// Private object-storage contract for generated reports and exports.
//
// Two backends implement the same opaque-`storageRef` contract:
//
// - `local` (default): files under `.private-storage/` in the working
//   directory. Suitable for development and tests only — serverless deploys
//   (Vercel) have an ephemeral, read-only filesystem.
// - `supabase`: the private `reports` Supabase Storage bucket provisioned by
//   the migrations (see supabase/migrations/20260714060500_*.sql). Report and
//   export objects are server-generated — the migrations deliberately removed
//   authenticated client write policies on this bucket — so uploads go through
//   the existing server-side service-role client
//   (`@/integrations/supabase/client.server`). Objects are keyed under the
//   owner's user id (`<userId>/<kind>/<file>`) so the bucket's
//   "own folder read" RLS policy keeps applying to direct authenticated reads.
//
// Select the backend with `ACNETREX_STORAGE_BACKEND=supabase|local` (unset
// means `local`). Unknown values and missing Supabase configuration fail
// closed with `StorageBackendError` instead of silently writing to ephemeral
// disk. No object written by this module is ever placed under `public/`, and
// every read/download goes through an authenticated, ownership-checked API
// route (see /api/reports/[id]/download) rather than a direct/public URL —
// callers only deal with opaque `storageRef` strings.
import { mkdir, readFile, rm, stat, writeFile } from "fs/promises";
import path from "path";

const STORAGE_ROOT = path.resolve(process.cwd(), ".private-storage");

export type StorageBackend = "local" | "supabase";

export type StorageFailureReason =
  | "storage_backend_invalid"
  | "storage_not_configured"
  | "storage_unavailable";

/** Fail-closed storage configuration/availability failure. */
export class StorageBackendError extends Error {
  readonly reason: StorageFailureReason;

  constructor(reason: StorageFailureReason, options?: { cause?: unknown }) {
    super(reason, options);
    this.name = "StorageBackendError";
    this.reason = reason;
  }
}

/**
 * Missing object. Carries `code = "ENOENT"` so callers that already handle
 * the local filesystem contract (see getReportFileBuffer) treat both backends
 * identically.
 */
export class StorageObjectNotFoundError extends Error {
  readonly code = "ENOENT";

  constructor(storageRef: string) {
    super(`storage_object_not_found: ${storageRef}`);
    this.name = "StorageObjectNotFoundError";
  }
}

export function resolveStorageBackend(): StorageBackend {
  const raw = process.env.ACNETREX_STORAGE_BACKEND?.trim().toLowerCase();
  if (!raw || raw === "local") return "local";
  if (raw === "supabase") return "supabase";
  throw new StorageBackendError("storage_backend_invalid");
}

function storageRefSegments(storageRef: string): string[] {
  const normalized = storageRef.replace(/\\/g, "/");
  const segments = normalized.split("/");
  if (
    !normalized ||
    path.posix.isAbsolute(normalized) ||
    /^[a-zA-Z]:\//.test(normalized) ||
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error("invalid_storage_reference");
  }
  return segments;
}

export function resolvePrivateStoragePath(storageRef: string): string {
  const segments = storageRefSegments(storageRef);
  const fullPath = path.resolve(STORAGE_ROOT, ...segments);
  const rootPrefix = `${STORAGE_ROOT}${path.sep}`;
  if (!fullPath.startsWith(rootPrefix)) {
    throw new Error("invalid_storage_reference");
  }
  return fullPath;
}

// The migrations provision exactly one private bucket for generated
// documents; its mime allowlist covers both report PDFs and export archives.
const SUPABASE_DOCUMENTS_BUCKET = "reports";

const STORAGE_REF_KINDS = new Set(["reports", "exports"]);

// Mirrors the bucket's `allowed_mime_types` from the migrations; anything
// else would be rejected by Supabase, so fail closed before uploading.
const SUPABASE_CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".json": "application/json",
  ".csv": "text/csv",
};

/**
 * Map an opaque `storageRef` (`<kind>/<userId>/<file>`) onto the private
 * bucket. The object path leads with the owner's user id so the
 * "own folder read" storage RLS policy (first folder = auth.uid()) still
 * governs any direct authenticated read of the same object.
 */
export function resolveSupabaseStorageLocation(storageRef: string): {
  bucket: string;
  objectPath: string;
} {
  const [kind, userId, ...rest] = storageRefSegments(storageRef);
  if (!STORAGE_REF_KINDS.has(kind) || !userId || rest.length === 0) {
    throw new Error("invalid_storage_reference");
  }
  return {
    bucket: SUPABASE_DOCUMENTS_BUCKET,
    objectPath: [userId, kind, ...rest].join("/"),
  };
}

function supabaseContentType(storageRef: string): string {
  const contentType = SUPABASE_CONTENT_TYPES[path.posix.extname(storageRef).toLowerCase()];
  if (!contentType) {
    throw new Error("unsupported_storage_content_type");
  }
  return contentType;
}

type StorageErrorLike = {
  message?: string;
  status?: number;
  statusCode?: string | number;
};

function isBucketMissing(error: StorageErrorLike): boolean {
  return /bucket not found/i.test(error.message ?? "");
}

function isObjectMissing(error: StorageErrorLike): boolean {
  return (
    error.status === 404 ||
    error.statusCode === 404 ||
    error.statusCode === "404" ||
    /object not found|not_found/i.test(error.message ?? "")
  );
}

async function supabaseStorage() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new StorageBackendError("storage_not_configured");
  }
  // Loaded lazily per the client.server contract (server handlers only).
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin.storage;
}

async function supabasePutObject(
  storageRef: string,
  data: Buffer,
): Promise<{ sizeBytes: number }> {
  const { bucket, objectPath } = resolveSupabaseStorageLocation(storageRef);
  const contentType = supabaseContentType(storageRef);
  const storage = await supabaseStorage();
  const { error } = await storage.from(bucket).upload(objectPath, data, {
    contentType,
    upsert: true,
  });
  if (error) {
    if (isBucketMissing(error)) {
      throw new StorageBackendError("storage_not_configured", { cause: error });
    }
    throw new StorageBackendError("storage_unavailable", { cause: error });
  }
  return { sizeBytes: data.byteLength };
}

async function supabaseGetObject(storageRef: string): Promise<Buffer> {
  const { bucket, objectPath } = resolveSupabaseStorageLocation(storageRef);
  const storage = await supabaseStorage();
  const { data, error } = await storage.from(bucket).download(objectPath);
  if (error) {
    if (isBucketMissing(error)) {
      throw new StorageBackendError("storage_not_configured", { cause: error });
    }
    if (isObjectMissing(error)) {
      throw new StorageObjectNotFoundError(storageRef);
    }
    throw new StorageBackendError("storage_unavailable", { cause: error });
  }
  if (!data) {
    throw new StorageObjectNotFoundError(storageRef);
  }
  return Buffer.from(await data.arrayBuffer());
}

async function supabaseDeleteObject(storageRef: string): Promise<void> {
  const { bucket, objectPath } = resolveSupabaseStorageLocation(storageRef);
  const storage = await supabaseStorage();
  // `remove` succeeds (empty result list) for already-absent objects, which
  // matches the local backend's `rm(..., { force: true })` semantics.
  const { error } = await storage.from(bucket).remove([objectPath]);
  if (error) {
    if (isBucketMissing(error)) {
      throw new StorageBackendError("storage_not_configured", { cause: error });
    }
    throw new StorageBackendError("storage_unavailable", { cause: error });
  }
}

export async function putObject(
  storageRef: string,
  data: Buffer,
): Promise<{ sizeBytes: number }> {
  if (resolveStorageBackend() === "supabase") {
    return supabasePutObject(storageRef, data);
  }
  const fullPath = resolvePrivateStoragePath(storageRef);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, data);
  const info = await stat(fullPath);
  return { sizeBytes: info.size };
}

export async function getObject(storageRef: string): Promise<Buffer> {
  if (resolveStorageBackend() === "supabase") {
    return supabaseGetObject(storageRef);
  }
  return readFile(resolvePrivateStoragePath(storageRef));
}

export async function deleteObject(storageRef: string): Promise<void> {
  if (resolveStorageBackend() === "supabase") {
    return supabaseDeleteObject(storageRef);
  }
  await rm(resolvePrivateStoragePath(storageRef), { force: true });
}

export function buildReportStorageRef(userId: string, reportRequestId: string): string {
  return `reports/${userId}/${reportRequestId}.pdf`;
}

export function buildExportStorageRef(
  userId: string,
  exportRequestId: string,
  extension: string,
): string {
  return `exports/${userId}/${exportRequestId}.${extension}`;
}
