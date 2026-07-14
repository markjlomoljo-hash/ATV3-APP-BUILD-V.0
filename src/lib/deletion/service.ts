// Legacy Drizzle deletion mutations are disabled. They target the secondary
// web-compatibility schema and cannot satisfy the canonical grace-period,
// lease, checkpoint, media-cleanup, and identity-revocation contract.
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { deletionRequests } from "@/db/schema";
import type { DeletionRequestRecord, DeletionType } from "@/types/profile";

function unavailable(): never {
  throw new Error("deletion_worker_not_configured");
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

export async function createDeletionRequest(
  _userId: string,
  _type: DeletionType,
  _exportRequestedFirst: boolean,
): Promise<DeletionRequestRecord> {
  return unavailable();
}

export async function listDeletionRequests(userId: string): Promise<DeletionRequestRecord[]> {
  const rows = await getDb()
    .select()
    .from(deletionRequests)
    .where(eq(deletionRequests.userId, userId));
  return rows
    .sort((left, right) => right.requestedAt.getTime() - left.requestedAt.getTime())
    .map(toRecord);
}

export async function cancelDeletionIfAllowed(
  _userId: string,
  _deletionRequestId: string,
): Promise<{ cancelled: boolean; reason?: string }> {
  return unavailable();
}

export async function purgeDueDeletions(): Promise<{ processed: number }> {
  return unavailable();
}
