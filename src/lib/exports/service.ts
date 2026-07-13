import { ZipArchive } from "archiver";
import { PassThrough } from "stream";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { exportFiles, exportRequests } from "@/db/schema";
import { ExportFormat, ExportMetadata, ExportScope } from "@/types/profile";
import { buildExportStorageRef, getObject, putObject } from "@/lib/storage";
import { gatherExportBundle } from "./compile";
import { toCsv } from "./csv";
import { recordProfileAuditEvent } from "@/lib/audit";

async function zipCsvFiles(bundle: Record<string, Array<Record<string, unknown>>>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = new ZipArchive({ zlib: { level: 9 } });
    const stream = new PassThrough();
    const chunks: Buffer[] = [];

    stream.on("data", (chunk) => chunks.push(chunk as Buffer));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
    archive.on("error", reject);
    archive.pipe(stream);

    for (const [name, rows] of Object.entries(bundle)) {
      archive.append(toCsv(rows), { name: `${name}.csv` });
    }

    archive.finalize().catch(reject);
  });
}

export async function createAndProcessExport(
  userId: string,
  format: ExportFormat,
  scope: ExportScope,
): Promise<{ exportRequestId: string; status: string }> {
  const db = getDb();
  const [request] = await db
    .insert(exportRequests)
    .values({ userId, format, scope, status: "processing" })
    .returning();

  try {
    const bundle = await gatherExportBundle(userId, scope);
    let buffer: Buffer;
    let mimeType: string;
    let extension: string;

    if (format === "json") {
      buffer = Buffer.from(JSON.stringify({ exportedAt: new Date().toISOString(), scope, data: bundle }, null, 2));
      mimeType = "application/json";
      extension = "json";
    } else {
      buffer = await zipCsvFiles(bundle);
      mimeType = "application/zip";
      extension = "zip";
    }

    const storageRef = buildExportStorageRef(userId, request.id, extension);
    const { sizeBytes } = await putObject(storageRef, buffer);

    await db.insert(exportFiles).values({
      userId,
      exportRequestId: request.id,
      storageRef,
      mimeType,
      sizeBytes,
    });

    await db.update(exportRequests).set({ status: "completed" }).where(eq(exportRequests.id, request.id));
    await recordProfileAuditEvent(userId, "export_generated", {
      exportRequestId: request.id,
      format,
      scope,
    });

    return { exportRequestId: request.id, status: "completed" };
  } catch {
    await db.update(exportRequests).set({ status: "failed" }).where(eq(exportRequests.id, request.id));
    return { exportRequestId: request.id, status: "failed" };
  }
}

export async function getExportMetadata(
  userId: string,
  exportRequestId: string,
): Promise<ExportMetadata | null> {
  const db = getDb();
  const [request] = await db
    .select()
    .from(exportRequests)
    .where(and(eq(exportRequests.id, exportRequestId), eq(exportRequests.userId, userId)))
    .limit(1);
  if (!request) return null;

  const [file] = await db
    .select()
    .from(exportFiles)
    .where(and(eq(exportFiles.exportRequestId, exportRequestId), eq(exportFiles.userId, userId)))
    .limit(1);

  return {
    id: request.id,
    format: request.format as ExportFormat,
    scope: request.scope as ExportScope,
    status: request.status as ExportMetadata["status"],
    requestedAt: request.requestedAt.toISOString(),
    fileSizeBytes: file?.sizeBytes ?? null,
  };
}

export async function listExportHistory(userId: string): Promise<ExportMetadata[]> {
  const db = getDb();
  const requests = await db
    .select()
    .from(exportRequests)
    .where(eq(exportRequests.userId, userId))
    .orderBy(desc(exportRequests.requestedAt));

  const results: ExportMetadata[] = [];
  for (const r of requests) {
    const [file] = await db
      .select()
      .from(exportFiles)
      .where(and(eq(exportFiles.exportRequestId, r.id), eq(exportFiles.userId, userId)))
      .limit(1);
    results.push({
      id: r.id,
      format: r.format as ExportFormat,
      scope: r.scope as ExportScope,
      status: r.status as ExportMetadata["status"],
      requestedAt: r.requestedAt.toISOString(),
      fileSizeBytes: file?.sizeBytes ?? null,
    });
  }
  return results;
}

export async function getExportFile(
  userId: string,
  exportRequestId: string,
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const db = getDb();
  const [request] = await db
    .select()
    .from(exportRequests)
    .where(and(eq(exportRequests.id, exportRequestId), eq(exportRequests.userId, userId)))
    .limit(1);
  if (!request || request.status !== "completed") return null;

  const [file] = await db
    .select()
    .from(exportFiles)
    .where(and(eq(exportFiles.exportRequestId, exportRequestId), eq(exportFiles.userId, userId)))
    .limit(1);
  if (!file) return null;

  const buffer = await getObject(file.storageRef);
  return { buffer, mimeType: file.mimeType };
}
