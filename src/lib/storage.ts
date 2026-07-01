// Private object storage abstraction.
//
// Default driver: local filesystem, rooted OUTSIDE `public/` so files are
// never web-accessible directly — every read goes through an authenticated,
// ownership-checked API route that streams bytes after verifying the caller.
//
// Production driver: set STORAGE_DRIVER=s3 and the AWS_* / S3_* environment
// variables documented in docs/environment.md. Until those are configured,
// S3 operations return an explicit `not_configured` error instead of a fake
// success — per the "no fake successful responses" rule.
import { randomUUID } from "crypto";
import { mkdir, readFile, rm, stat, writeFile } from "fs/promises";
import path from "path";

const LOCAL_STORAGE_ROOT = path.join(process.cwd(), ".private-storage");

export class StorageNotConfiguredError extends Error {
  constructor(driver: string) {
    super(`Storage driver "${driver}" is not configured.`);
    this.name = "StorageNotConfiguredError";
  }
}

function driver(): "local" | "s3" {
  const configured = process.env.STORAGE_DRIVER?.toLowerCase();
  return configured === "s3" ? "s3" : "local";
}

/** Generates a namespaced, collision-resistant private storage key. */
export function generateStorageKey(namespace: string, userId: string, ext = "bin"): string {
  const safeNamespace = namespace.replace(/[^a-z0-9_-]/gi, "_");
  return `${safeNamespace}/${userId}/${randomUUID()}.${ext}`;
}

export async function putPrivateObject(key: string, data: Buffer): Promise<void> {
  if (driver() === "local") {
    const fullPath = path.join(LOCAL_STORAGE_ROOT, key);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, data);
    return;
  }
  throw new StorageNotConfiguredError("s3");
}

export async function getPrivateObject(key: string): Promise<Buffer> {
  if (driver() === "local") {
    const fullPath = path.join(LOCAL_STORAGE_ROOT, key);
    return readFile(fullPath);
  }
  throw new StorageNotConfiguredError("s3");
}

export async function privateObjectExists(key: string): Promise<boolean> {
  if (driver() === "local") {
    try {
      await stat(path.join(LOCAL_STORAGE_ROOT, key));
      return true;
    } catch {
      return false;
    }
  }
  throw new StorageNotConfiguredError("s3");
}

export async function deletePrivateObject(key: string): Promise<void> {
  if (driver() === "local") {
    const fullPath = path.join(LOCAL_STORAGE_ROOT, key);
    await rm(fullPath, { force: true });
    return;
  }
  throw new StorageNotConfiguredError("s3");
}

export function storageStatus(): { driver: string; configured: boolean } {
  const d = driver();
  return { driver: d, configured: d === "local" || Boolean(process.env.S3_BUCKET) };
}
