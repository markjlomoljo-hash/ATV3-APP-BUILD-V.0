import { db } from "@/db";
import { auditLogs } from "@/db/schema";

export interface AuditEntry {
  userId?: string | null;
  actorUserId?: string | null;
  action: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Writes a durable audit log row for a sensitive action. Never throws to the
 * caller — audit logging failures are logged to stderr but must not break
 * the primary request flow.
 */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: entry.userId ?? null,
      actorUserId: entry.actorUserId ?? entry.userId ?? null,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      ipAddress: entry.ipAddress ?? null,
      metadata: entry.metadata ?? null,
    });
  } catch (err) {
    console.error("[audit_log_failed]", entry.action, err);
  }
}
