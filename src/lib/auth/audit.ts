import "server-only";

import { getPool, isDatabaseConfigurationError } from "@/db";
import { AuthorizationError } from "./errors";
import type { AuthorizationContext } from "./authorization";

function classifyDatabaseError(error: unknown): AuthorizationError {
  if (isDatabaseConfigurationError(error)) return new AuthorizationError("database_not_configured");
  const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
    ? error.code
    : undefined;
  if (code === "42P01" || code === "42703") return new AuthorizationError("migration_missing");
  return new AuthorizationError("audit_unavailable");
}

export async function assertAdminAuditReady(): Promise<void> {
  try {
    const pool = getPool();
    await pool.query("select 1 from public.audit_logs, public.clerk_role_history limit 0");
  } catch (error) {
    throw classifyDatabaseError(error);
  }
}

export async function recordAdminAuditEvent(
  context: AuthorizationContext,
  input: {
    action: string;
    targetClerkUserId?: string;
    targetTable?: string;
    reason?: string;
    roleVersion?: number;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    const pool = getPool();
    await pool.query(
      `insert into public.audit_logs
        (user_id, actor_type, actor_clerk_user_id, action, target_table,
         target_id, target_clerk_user_id, reason, role_version, metadata)
       values (null, 'clerk', $1, $2, $3, null, $4, $5, $6, $7::jsonb)`,
      [
        context.clerkUserId,
        input.action,
        input.targetTable ?? null,
        input.targetClerkUserId ?? null,
        input.reason ?? null,
        input.roleVersion ?? null,
        JSON.stringify({ actorRole: context.role, ...input.metadata }),
      ],
    );
  } catch (error) {
    throw classifyDatabaseError(error);
  }
}

export function adminDatabaseError(error: unknown): AuthorizationError {
  return classifyDatabaseError(error);
}
