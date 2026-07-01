import { db } from "@/db";
import { deletionAuditEvents, profileAuditEvents } from "@/db/schema";

export async function recordProfileAuditEvent(
  userId: string,
  eventType: string,
  metadata: Record<string, unknown> = {},
) {
  await db.insert(profileAuditEvents).values({
    userId,
    eventType,
    metadataJson: metadata,
  });
}

export async function recordDeletionAuditEvent(
  deletionRequestId: string,
  userId: string,
  eventType: string,
  metadata: Record<string, unknown> = {},
) {
  await db.insert(deletionAuditEvents).values({
    deletionRequestId,
    userId,
    eventType,
    metadataJson: metadata,
  });
}
