// Account/data deletion workflow. Every deletion is: requested -> scheduled
// (retention window, cancellable) -> completed (purged) or cancelled. This
// keeps deletion safe, auditable, and reversible during the retention
// window, per the PRD's privacy-first requirement.
import { and, eq, lte } from "drizzle-orm";
import { getDb, type AppDb } from "@/db";
import {
  badges,
  consentSettings,
  dailyLogs,
  deletionRequests,
  exportFiles,
  exportRequests,
  faceAtlasScans,
  forecastSummaries,
  profileSections,
  profileVersionHistory,
  reportConsentSnapshots,
  reportFiles,
  reportJobs,
  reportRequests,
  streakState,
  tasks,
  treatmentCheckins,
  treatmentPlans,
  triggerHypotheses,
  users,
  weatherSnapshots,
} from "@/db/schema";
import { deleteObject } from "@/lib/storage";
import { DELETION_RETENTION_WINDOW_DAYS, DeletionRequestRecord, DeletionType } from "@/types/profile";
import { recordDeletionAuditEvent } from "@/lib/audit";

export async function createDeletionRequest(
  userId: string,
  type: DeletionType,
  exportRequestedFirst: boolean,
): Promise<DeletionRequestRecord> {
  const db = getDb();
  const scheduledPurgeAt = new Date();
  scheduledPurgeAt.setDate(scheduledPurgeAt.getDate() + DELETION_RETENTION_WINDOW_DAYS);

  const [row] = await db
    .insert(deletionRequests)
    .values({
      userId,
      type,
      status: "scheduled",
      scheduledPurgeAt,
      exportRequestedFirst,
    })
    .returning();

  await recordDeletionAuditEvent(row.id, userId, "deletion_requested", {
    type,
    scheduledPurgeAt: scheduledPurgeAt.toISOString(),
    exportRequestedFirst,
  });

  return toRecord(row);
}

function toRecord(row: typeof deletionRequests.$inferSelect): DeletionRequestRecord {
  return {
    id: row.id,
    type: row.type as DeletionType,
    status: row.status as DeletionRequestRecord["status"],
    requestedAt: row.requestedAt.toISOString(),
    scheduledPurgeAt: row.scheduledPurgeAt?.toISOString() ?? null,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    exportRequestedFirst: row.exportRequestedFirst,
  };
}

export async function listDeletionRequests(userId: string): Promise<DeletionRequestRecord[]> {
  const db = getDb();
  const rows = await db.select().from(deletionRequests).where(eq(deletionRequests.userId, userId));
  return rows.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime()).map(toRecord);
}

export async function cancelDeletionIfAllowed(
  userId: string,
  deletionRequestId: string,
): Promise<{ cancelled: boolean; reason?: string }> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(deletionRequests)
    .where(and(eq(deletionRequests.id, deletionRequestId), eq(deletionRequests.userId, userId)))
    .limit(1);

  if (!row) return { cancelled: false, reason: "not_found" };
  if (row.status !== "scheduled") return { cancelled: false, reason: `cannot_cancel_status_${row.status}` };
  if (row.scheduledPurgeAt && row.scheduledPurgeAt.getTime() <= Date.now()) {
    return { cancelled: false, reason: "retention_window_elapsed" };
  }

  await db
    .update(deletionRequests)
    .set({ status: "cancelled", cancelledAt: new Date() })
    .where(eq(deletionRequests.id, deletionRequestId));

  await recordDeletionAuditEvent(deletionRequestId, userId, "deletion_cancelled", {});

  return { cancelled: true };
}

async function purgeFaceAtlas(db: AppDb, userId: string) {
  const scans = await db.select().from(faceAtlasScans).where(eq(faceAtlasScans.userId, userId));
  for (const scan of scans) {
    if (scan.imageStorageRef) await deleteObject(scan.imageStorageRef);
  }
  await db.delete(faceAtlasScans).where(eq(faceAtlasScans.userId, userId));
}

async function purgeLogs(db: AppDb, userId: string) {
  await db.delete(dailyLogs).where(eq(dailyLogs.userId, userId));
}

async function purgeReports(db: AppDb, userId: string) {
  const requests = await db.select().from(reportRequests).where(eq(reportRequests.userId, userId));
  for (const request of requests) {
    const files = await db.select().from(reportFiles).where(eq(reportFiles.reportRequestId, request.id));
    for (const file of files) await deleteObject(file.storageRef);
    await db.delete(reportFiles).where(eq(reportFiles.reportRequestId, request.id));
    await db.delete(reportJobs).where(eq(reportJobs.reportRequestId, request.id));
    await db.delete(reportConsentSnapshots).where(eq(reportConsentSnapshots.reportRequestId, request.id));
  }
  await db.delete(reportRequests).where(eq(reportRequests.userId, userId));
}

async function purgeExports(db: AppDb, userId: string) {
  const requests = await db.select().from(exportRequests).where(eq(exportRequests.userId, userId));
  for (const request of requests) {
    const files = await db.select().from(exportFiles).where(eq(exportFiles.exportRequestId, request.id));
    for (const file of files) await deleteObject(file.storageRef);
    await db.delete(exportFiles).where(eq(exportFiles.exportRequestId, request.id));
  }
  await db.delete(exportRequests).where(eq(exportRequests.userId, userId));
}

async function purgeRemainingAppData(db: AppDb, userId: string) {
  await db.delete(treatmentCheckins).where(eq(treatmentCheckins.userId, userId));
  await db.delete(treatmentPlans).where(eq(treatmentPlans.userId, userId));
  await db.delete(triggerHypotheses).where(eq(triggerHypotheses.userId, userId));
  await db.delete(forecastSummaries).where(eq(forecastSummaries.userId, userId));
  await db.delete(tasks).where(eq(tasks.userId, userId));
  await db.delete(streakState).where(eq(streakState.userId, userId));
  await db.delete(badges).where(eq(badges.userId, userId));
  await db.delete(weatherSnapshots).where(eq(weatherSnapshots.userId, userId));
  await db.delete(profileVersionHistory).where(eq(profileVersionHistory.userId, userId));
  await db.delete(profileSections).where(eq(profileSections.userId, userId));
}

async function executeDeletion(db: AppDb, row: typeof deletionRequests.$inferSelect) {
  const { userId, type } = row;

  if (type === "faceatlas_only") {
    await purgeFaceAtlas(db, userId);
  } else if (type === "logs_only") {
    await purgeLogs(db, userId);
  } else if (type === "reports_only") {
    await purgeReports(db, userId);
  } else if (type === "data" || type === "account") {
    await purgeFaceAtlas(db, userId);
    await purgeLogs(db, userId);
    await purgeReports(db, userId);
    await purgeExports(db, userId);
    await purgeRemainingAppData(db, userId);
    if (type === "account") {
      await db.delete(consentSettings).where(eq(consentSettings.userId, userId));
      await db.delete(users).where(eq(users.id, userId));
    }
  }

  await db
    .update(deletionRequests)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(deletionRequests.id, row.id));

  await recordDeletionAuditEvent(row.id, userId, "deletion_completed", { type });
}

/** Intended to be invoked by a cron/background worker on an interval. */
export async function purgeDueDeletions(): Promise<{ processed: number }> {
  // The legacy one-pass purge cannot safely resume after partial storage or
  // database failure. Keep it fail-closed until the checkpointed deletion_jobs
  // worker is deployed and verified end-to-end.
  throw new Error("deletion_worker_not_configured");
}
