import { getDb, isDatabaseConfigurationError } from "@/db";
import { deletionAuditEvents, profileAuditEvents } from "@/db/schema";

export async function recordProfileAuditEvent(
  userId: string,
  eventType: string,
  metadata: Record<string, unknown> = {},
) {
  try {
    const db = getDb();
    await db.insert(profileAuditEvents).values({
      userId,
      eventType,
      metadataJson: metadata,
    });
  } catch (error) {
    if (isDatabaseConfigurationError(error)) {
      console.warn("[audit] database is not configured; skipping profile audit event");
      return;
    }
    throw error;
  }
}

export async function recordDeletionAuditEvent(
  deletionRequestId: string,
  userId: string,
  eventType: string,
  metadata: Record<string, unknown> = {},
) {
  try {
    const db = getDb();
    await db.insert(deletionAuditEvents).values({
      deletionRequestId,
      userId,
      eventType,
      metadataJson: metadata,
    });
  } catch (error) {
    if (isDatabaseConfigurationError(error)) {
      console.warn("[audit] database is not configured; skipping deletion audit event");
      return;
    }
    throw error;
  }
}
