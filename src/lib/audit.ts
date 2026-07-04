import { getDb } from "@/db";
import { deletionAuditEvents, profileAuditEvents } from "@/db/schema";

export async function recordProfileAuditEvent(
  userId: string,
  eventType: string,
  metadata: Record<string, unknown> = {},
) {
  // Retrieve the database instance. getDb() may return undefined when
  // DATABASE_URL isn't configured, so guard against that to avoid runtime
  // errors and TypeScript compile errors. See other API routes for examples.
  const db = getDb();
  if (!db) {
    // If the database isn't configured, log a warning and bail out. This
    // allows the application to run without a database during local
    // development or when environment variables are missing.
    console.warn("[audit] database is not configured; skipping profile audit event");
    return;
  }
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
  // Retrieve the database instance. It may be undefined when the database
  // connection string is not provided, so guard accordingly.
  const db = getDb();
  if (!db) {
    console.warn("[audit] database is not configured; skipping deletion audit event");
    return;
  }
  await db.insert(deletionAuditEvents).values({
    deletionRequestId,
    userId,
    eventType,
    metadataJson: metadata,
  });
}
