// Private object-storage contract for generated reports and exports.
//
// Production deployments must back this with a real private object store
// (S3/GCS/Azure Blob) using short-lived signed URLs. No object written by
// this module is ever placed under `public/`, and every read/download in
// this phase goes through an authenticated, ownership-checked API route
// (see /api/reports/[id]/download and /api/exports/[id]/download) rather
// than a direct/public URL. Swapping the implementation below for an S3
// SDK client only requires changing this file — callers only deal with
// opaque `storageRef` strings.
import { mkdir, readFile, rm, stat, writeFile } from "fs/promises";
import path from "path";

const STORAGE_ROOT = path.join(process.cwd(), ".private-storage");

function resolvePath(storageRef: string): string {
  const safe = storageRef.replace(/\.\./g, "");
  return path.join(STORAGE_ROOT, safe);
}

export async function putObject(
  storageRef: string,
  data: Buffer,
): Promise<{ sizeBytes: number }> {
  const fullPath = resolvePath(storageRef);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, data);
  const info = await stat(fullPath);
  return { sizeBytes: info.size };
}

export async function getObject(storageRef: string): Promise<Buffer> {
  return readFile(resolvePath(storageRef));
}

export async function deleteObject(storageRef: string): Promise<void> {
  await rm(resolvePath(storageRef), { force: true });
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
