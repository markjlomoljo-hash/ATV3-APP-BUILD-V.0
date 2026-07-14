import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import { getDb, getPool, isDatabaseConfigurationError } from "@/db";
import { sql, type SQL } from "drizzle-orm";
import {
  requireOwner,
  requirePermission,
  requireRecentAuthentication,
  type AuthorizationContext,
} from "@/lib/auth/authorization";
import { adminDatabaseError, assertAdminAuditReady, recordAdminAuditEvent } from "@/lib/auth/audit";
import { AuthorizationError } from "@/lib/auth/errors";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { APP_ROLES, normalizeRole, ROLE_RANK, type AppRole } from "@/lib/auth/roles";

export type AdminDataError = "database_not_configured" | "database_unavailable" | "migration_missing" | "not_found" | "feature_not_configured" | "clerk_unavailable";
export type AdminReadResult<T> = { ok: true; data: T } | { ok: false; error: AdminDataError };
type QueryResult<T> = { ok: true; rows: T[] } | { ok: false; error: AdminDataError };

function classifyDatabaseError(error: unknown): AdminDataError {
  if (isDatabaseConfigurationError(error)) return "database_not_configured";
  const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : undefined;
  return code === "42P01" || code === "42703" ? "migration_missing" : "database_unavailable";
}

async function query<T>(statement: SQL): Promise<QueryResult<T>> {
  try {
    const result = await getDb().execute<Record<string, unknown>>(statement);
    return { ok: true, rows: result.rows as T[] };
  } catch (error) {
    return { ok: false, error: classifyDatabaseError(error) };
  }
}

function metric(value: number | null, detail?: string) {
  return value === null
    ? { value: null, status: "unavailable" as const, detail: detail ?? "No verified data source is configured." }
    : { value, status: "ready" as const };
}

function rateLimit(context: AuthorizationContext, operation: string): void {
  const result = consumeRateLimit(`admin:${operation}:${context.clerkUserId}`, 10, 60_000);
  if (!result.allowed) throw new AuthorizationError("rate_limited");
}

function requireReason(reason: string, minimum = 3): string {
  const value = reason.trim();
  if (value.length < minimum || value.length > 1000) throw new AuthorizationError("invalid_target");
  return value;
}

function validClerkUserId(value: string): boolean {
  return /^user_[A-Za-z0-9_-]{6,128}$/.test(value);
}

function primaryEmail(user: { primaryEmailAddress?: { emailAddress: string; verification: { status?: string } | null } | null }) {
  return {
    email: user.primaryEmailAddress?.emailAddress ?? null,
    verified: user.primaryEmailAddress?.verification?.status === "verified",
  };
}

async function clerkCount(params: Parameters<(Awaited<ReturnType<typeof clerkClient>>)["users"]["getUserList"]>[0]) {
  const client = await clerkClient();
  const result = await client.users.getUserList({ ...params, limit: 1, offset: 0 });
  return result.totalCount;
}

export async function getAdminOverview(): Promise<AdminReadResult<Record<string, unknown>>> {
  try {
    const now = Date.now();
    const [total, active5m, active24h, active7d, active30d, new24h] = await Promise.all([
      clerkCount({}),
      clerkCount({ lastActiveAtAfter: now - 5 * 60_000 }),
      clerkCount({ lastActiveAtAfter: now - 24 * 60 * 60_000 }),
      clerkCount({ lastActiveAtAfter: now - 7 * 24 * 60 * 60_000 }),
      clerkCount({ lastActiveAtAfter: now - 30 * 24 * 60 * 60_000 }),
      clerkCount({ createdAtAfter: now - 24 * 60 * 60_000 }),
    ]);

    const queues = await query<{ pending_exports: number; pending_deletions: number; failed_jobs: number }>(sql`
      select
        (select count(*)::int from public.export_requests where status in ('queued', 'processing')) as pending_exports,
        (select count(*)::int from public.deletion_requests where status in ('pending', 'scheduled', 'processing')) as pending_deletions,
        (select count(*)::int from public.report_jobs where status = 'failed') as failed_jobs
    `);
    const queue = queues.ok ? queues.rows[0] : undefined;

    return {
      ok: true,
      data: {
        metrics: {
          totalRegisteredUsers: metric(total),
          verifiedUsers: metric(null, "Clerk does not expose a verification-count filter; record-by-record enumeration is intentionally avoided."),
          unverifiedUsers: metric(null, "Clerk does not expose a verification-count filter; record-by-record enumeration is intentionally avoided."),
          activeLastFiveMinutes: metric(active5m),
          activeLastTwentyFourHours: metric(active24h),
          dailyActiveUsers: metric(active24h),
          weeklyActiveUsers: metric(active7d),
          monthlyActiveUsers: metric(active30d),
          newUsersLastTwentyFourHours: metric(new24h),
          onboardingCompletion: metric(null, "A verified Clerk-to-Supabase identity mapping is required."),
          pendingExports: queues.ok ? metric(Number(queue?.pending_exports ?? 0)) : metric(null, queues.error),
          pendingDeletions: queues.ok ? metric(Number(queue?.pending_deletions ?? 0)) : metric(null, queues.error),
          failedJobs: queues.ok ? metric(Number(queue?.failed_jobs ?? 0)) : metric(null, queues.error),
        },
        sources: {
          identityAndPresence: "clerk",
          operationalQueues: queues.ok ? "supabase" : queues.error,
          activeDefinition: "Clerk lastActiveAt, not last sign-in",
        },
      },
    };
  } catch {
    return { ok: false, error: "clerk_unavailable" };
  }
}

export async function listAdminUsers(input: { page: number; pageSize: number; search?: string; orderBy?: "+created_at" | "-created_at" | "+last_active_at" | "-last_active_at" }): Promise<AdminReadResult<Record<string, unknown>>> {
  try {
    const client = await clerkClient();
    const result = await client.users.getUserList({
      limit: input.pageSize,
      offset: (input.page - 1) * input.pageSize,
      query: input.search,
      orderBy: input.orderBy ?? "-created_at",
    });
    return {
      ok: true,
      data: {
        page: input.page,
        pageSize: input.pageSize,
        total: result.totalCount,
        users: result.data.map((user) => ({
          id: user.id,
          ...primaryEmail(user),
          displayName: user.fullName ?? user.username,
          role: normalizeRole(user.publicMetadata.role),
          roleVersion: typeof user.publicMetadata.roleVersion === "number" ? user.publicMetadata.roleVersion : 1,
          status: user.banned ? "suspended" : user.locked ? "locked" : user.privateMetadata.accountStatus ?? "active",
          createdAt: new Date(user.createdAt).toISOString(),
          lastActiveAt: user.lastActiveAt ? new Date(user.lastActiveAt).toISOString() : null,
          lastSignInAt: user.lastSignInAt ? new Date(user.lastSignInAt).toISOString() : null,
          githubConnected: user.externalAccounts.some((account) => account.provider === "github"),
        })),
      },
    };
  } catch {
    return { ok: false, error: "clerk_unavailable" };
  }
}

export async function getAdminUser(context: AuthorizationContext, userId: string): Promise<AdminReadResult<Record<string, unknown>>> {
  if (!validClerkUserId(userId)) return { ok: false, error: "not_found" };
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const supportLimited = context.role === "support";
    const email = primaryEmail(user);
    return {
      ok: true,
      data: {
        id: user.id,
        email: supportLimited && email.email ? `${email.email.slice(0, 1)}***@${email.email.split("@")[1] ?? "redacted"}` : email.email,
        verified: email.verified,
        displayName: user.fullName ?? user.username,
        role: normalizeRole(user.publicMetadata.role),
        roleVersion: typeof user.publicMetadata.roleVersion === "number" ? user.publicMetadata.roleVersion : 1,
        status: user.banned ? "suspended" : user.privateMetadata.accountStatus ?? "active",
        githubConnected: user.externalAccounts.some((account) => account.provider === "github"),
        twoFactorEnabled: user.twoFactorEnabled,
        createdAt: new Date(user.createdAt).toISOString(),
        lastActiveAt: user.lastActiveAt ? new Date(user.lastActiveAt).toISOString() : null,
        lastSignInAt: user.lastSignInAt ? new Date(user.lastSignInAt).toISOString() : null,
        sensitiveData: {
          status: "break_glass_required",
          detail: "Raw FaceAtlas images, CutisAI conversations, cycle records, treatment details, private reports, and health logs are excluded.",
        },
      },
    };
  } catch {
    return { ok: false, error: "not_found" };
  }
}

export async function getRoleCatalog(): Promise<AdminReadResult<Record<string, unknown>>> {
  return {
    ok: true,
    data: {
      roles: APP_ROLES.map((role) => ({ role, rank: ROLE_RANK[role], assignableBy: role === "owner" || role === "admin" ? "owner" : "owner or admin" })),
      source: "Clerk publicMetadata",
      staleSessionDefense: "Privileged requests re-read metadata through the Clerk Backend API.",
    },
  };
}

async function revokeUserSessions(userId: string): Promise<number> {
  const client = await clerkClient();
  const sessions = await client.sessions.getSessionList({ userId, limit: 100 });
  await Promise.all(sessions.data.filter((session) => session.status === "active").map((session) => client.sessions.revokeSession(session.id)));
  return sessions.data.filter((session) => session.status === "active").length;
}

async function persistRoleEvidence(context: AuthorizationContext, input: { targetUserId: string; role: AppRole; roleVersion: number; reason: string; action: string }): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query(
      `update public.clerk_role_history
       set revoked_at = now()
       where clerk_user_id = $1 and revoked_at is null`,
      [input.targetUserId],
    );
    await client.query(
      `insert into public.clerk_role_history
        (clerk_user_id, role, role_version, assigned_by_clerk_user_id, reason)
       values ($1, $2, $3, $4, $5)`,
      [input.targetUserId, input.role, input.roleVersion, context.clerkUserId, input.reason],
    );
    await client.query(
      `insert into public.audit_logs
        (user_id, actor_type, actor_clerk_user_id, action, target_table,
         target_id, target_clerk_user_id, reason, role_version, metadata)
       values (null, 'clerk', $1, $2, 'clerk_role_history', null, $3, $4, $5, $6::jsonb)`,
      [context.clerkUserId, input.action, input.targetUserId, input.reason, input.roleVersion, JSON.stringify({ role: input.role })],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw adminDatabaseError(error);
  } finally {
    client.release();
  }
}

export async function bootstrapOwner(context: AuthorizationContext, reasonInput: string) {
  requireOwner(context);
  requireRecentAuthentication(context);
  if (context.roleSource !== "owner_allowlist") throw new AuthorizationError("owner_protected");
  const reason = requireReason(reasonInput, 10);
  rateLimit(context, "owner-bootstrap");

  const client = await clerkClient();
  const user = await client.users.getUser(context.clerkUserId);
  const previousRole = normalizeRole(user.publicMetadata.role);
  const previousVersion = typeof user.publicMetadata.roleVersion === "number" && user.publicMetadata.roleVersion > 0
    ? user.publicMetadata.roleVersion
    : 1;
  const roleVersion = previousVersion + 1;

  await assertAdminAuditReady();
  await client.users.updateUserMetadata(context.clerkUserId, { publicMetadata: { role: "owner", roleVersion } });
  try {
    await persistRoleEvidence(context, {
      targetUserId: context.clerkUserId,
      role: "owner",
      roleVersion,
      reason,
      action: "owner_bootstrapped",
    });
  } catch (error) {
    await client.users.updateUserMetadata(context.clerkUserId, {
      publicMetadata: { role: previousRole, roleVersion: previousVersion },
    }).catch(() => undefined);
    throw error;
  }

  await client.sessions.revokeSession(context.sessionId);
  return { role: "owner" as const, roleVersion, sessionRevoked: true, signInRequired: true };
}

export async function mutateRole(context: AuthorizationContext, input: { targetUserId: string; targetRole: AppRole; reason: string; action: "role_assigned" | "role_revoked" }) {
  if (!validClerkUserId(input.targetUserId)) throw new AuthorizationError("invalid_target");
  if (input.targetUserId === context.clerkUserId) throw new AuthorizationError("self_change_forbidden");
  const reason = requireReason(input.reason);
  rateLimit(context, "role-mutation");

  const client = await clerkClient();
  const target = await client.users.getUser(input.targetUserId).catch(() => { throw new AuthorizationError("invalid_target"); });
  const previousRole = normalizeRole(target.publicMetadata.role);
  const previousVersion = typeof target.publicMetadata.roleVersion === "number" && target.publicMetadata.roleVersion > 0 ? target.publicMetadata.roleVersion : 1;

  if (previousRole === "owner" && input.targetRole !== "owner") throw new AuthorizationError("owner_protected");
  if (previousRole === "admin" && context.role !== "owner" && input.targetRole !== "admin") throw new AuthorizationError("owner_protected");
  if (input.targetRole === "owner") {
    requireOwner(context);
    requireRecentAuthentication(context);
  } else if (input.targetRole === "admin") {
    requireOwner(context);
    requireRecentAuthentication(context);
  } else {
    requirePermission(context, input.action === "role_revoked" ? "roles:revoke" : "roles:assign_lower");
  }

  await assertAdminAuditReady();
  const roleVersion = previousVersion + 1;
  await client.users.updateUserMetadata(input.targetUserId, { publicMetadata: { role: input.targetRole, roleVersion } });
  try {
    await persistRoleEvidence(context, { targetUserId: input.targetUserId, role: input.targetRole, roleVersion, reason, action: input.action });
  } catch (error) {
    await client.users.updateUserMetadata(input.targetUserId, { publicMetadata: { role: previousRole, roleVersion: previousVersion } }).catch(() => undefined);
    throw error;
  }
  const sessionsRevoked = await revokeUserSessions(input.targetUserId).catch(() => 0);
  return { role: input.targetRole, roleVersion, sessionsRevoked };
}

export async function setAccountStatus(context: AuthorizationContext, input: { targetUserId: string; status: "active" | "suspended" | "restricted"; reason: string }) {
  requirePermission(context, "users:suspend");
  if (!validClerkUserId(input.targetUserId)) throw new AuthorizationError("invalid_target");
  if (input.targetUserId === context.clerkUserId) throw new AuthorizationError("self_change_forbidden");
  const reason = requireReason(input.reason);
  rateLimit(context, "account-status");
  const client = await clerkClient();
  const target = await client.users.getUser(input.targetUserId).catch(() => { throw new AuthorizationError("invalid_target"); });
  if (normalizeRole(target.publicMetadata.role) === "owner") throw new AuthorizationError("owner_protected");
  await assertAdminAuditReady();
  await client.users.updateUserMetadata(input.targetUserId, { privateMetadata: { accountStatus: input.status, accountStatusReason: reason } });
  if (input.status === "suspended") await client.users.banUser(input.targetUserId);
  if (input.status === "active" && target.banned) await client.users.unbanUser(input.targetUserId);
  await recordAdminAuditEvent(context, { action: input.status === "active" ? "user_restored" : "user_restricted", targetClerkUserId: input.targetUserId, targetTable: "clerk_users", reason, metadata: { status: input.status } });
  const sessionsRevoked = input.status === "active" ? 0 : await revokeUserSessions(input.targetUserId).catch(() => 0);
  return { status: input.status, sessionsRevoked };
}

export async function revokeSessions(context: AuthorizationContext, targetUserId: string, reasonInput: string) {
  requirePermission(context, "sessions:revoke");
  if (!validClerkUserId(targetUserId)) throw new AuthorizationError("invalid_target");
  const reason = requireReason(reasonInput);
  rateLimit(context, "session-revoke");
  await assertAdminAuditReady();
  const sessionsRevoked = await revokeUserSessions(targetUserId);
  await recordAdminAuditEvent(context, { action: "sessions_revoked", targetClerkUserId: targetUserId, targetTable: "clerk_sessions", reason, metadata: { sessionsRevoked } });
  return { sessionsRevoked };
}

export async function issueBreakGlass(context: AuthorizationContext, input: { targetUserId: string; scope: string; reason: string; caseId: string; durationMinutes: number }) {
  requirePermission(context, "sensitive_records:request_access");
  requireRecentAuthentication(context);
  if (!validClerkUserId(input.targetUserId) || input.durationMinutes < 1 || input.durationMinutes > 60) throw new AuthorizationError("invalid_target");
  const reason = requireReason(input.reason, 10);
  if (input.caseId.trim().length < 3) throw new AuthorizationError("invalid_target");
  rateLimit(context, "break-glass");
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const result = await client.query<{ id: string; expires_at: string }>(
      `insert into public.admin_break_glass_sessions
        (actor_clerk_user_id, target_clerk_user_id, scope, reason, case_id, expires_at)
       values ($1, $2, $3, $4, $5, now() + ($6 * interval '1 minute'))
       returning id::text, expires_at::text`,
      [context.clerkUserId, input.targetUserId, input.scope, reason, input.caseId.trim(), input.durationMinutes],
    );
    const row = result.rows[0];
    if (!row) throw new AuthorizationError("audit_unavailable");
    await client.query(
      `insert into public.audit_logs
        (user_id, actor_type, actor_clerk_user_id, action, target_table, target_id,
         target_clerk_user_id, reason, metadata)
       values (null, 'clerk', $1, 'break_glass_issued', 'admin_break_glass_sessions', $2::uuid, $3, $4, $5::jsonb)`,
      [context.clerkUserId, row.id, input.targetUserId, reason, JSON.stringify({ scope: input.scope, caseId: input.caseId, durationMinutes: input.durationMinutes })],
    );
    await client.query("commit");
    return { id: row.id, expiresAt: row.expires_at, warning: "You are viewing protected user data under an audited access session." };
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    if (error instanceof AuthorizationError) throw error;
    throw adminDatabaseError(error);
  } finally {
    client.release();
  }
}

export async function getDatabaseStatus(): Promise<AdminReadResult<Record<string, unknown>>> {
  const tables = await query<{ table_name: string; rls_enabled: boolean }>(sql`
    select c.relname as table_name, c.relrowsecurity as rls_enabled
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = any(array[
      'user_roles', 'audit_logs', 'clerk_identity_map', 'clerk_role_history',
      'admin_break_glass_sessions', 'report_jobs', 'export_requests', 'deletion_requests'
    ]) order by c.relname
  `);
  if (!tables.ok) return tables;
  return { ok: true, data: { connectivity: "connected", tables: tables.rows, sqlConsole: "disabled" } };
}

export async function getAuditEvents(): Promise<AdminReadResult<Record<string, unknown>>> {
  const result = await query<{ id: string; actor_clerk_user_id: string | null; action: string; target_table: string | null; target_clerk_user_id: string | null; created_at: string }>(sql`
    select id::text, actor_clerk_user_id, action, target_table, target_clerk_user_id, created_at
    from public.audit_logs order by created_at desc limit 100
  `);
  return result.ok ? { ok: true, data: { events: result.rows, appendOnly: true, sensitiveMetadata: "redacted" } } : result;
}

export async function getJobs(): Promise<AdminReadResult<Record<string, unknown>>> {
  const result = await query<{ id: string; status: string; attempt_count: number; created_at: string }>(sql`
    select id::text, status, attempt_count, created_at from public.report_jobs order by created_at desc limit 100
  `);
  return result.ok ? { ok: true, data: { jobs: result.rows, contents: "excluded" } } : result;
}

export async function getPrivacyRequests(): Promise<AdminReadResult<Record<string, unknown>>> {
  const deletions = await query<Record<string, unknown>>(sql`select id::text, status, requested_at from public.deletion_requests order by requested_at desc limit 100`);
  const exports = await query<Record<string, unknown>>(sql`select id::text, status, requested_at from public.export_requests order by requested_at desc limit 100`);
  if (!deletions.ok) return deletions;
  if (!exports.ok) return exports;
  return { ok: true, data: { deletionRequests: deletions.rows, exportRequests: exports.rows } };
}

export async function notConfiguredFeature(feature: string): Promise<AdminReadResult<Record<string, unknown>>> {
  return { ok: true, data: { feature, status: "not_configured", reason: "No canonical persisted control source exists yet." } };
}
