import "server-only";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { AuthorizationError } from "./errors";
import { hasPermission as roleHasPermission, permissionsForRole, type AppPermission } from "./permissions";
import { normalizeRole, type AppRole } from "./roles";

export interface UserPublicMetadata {
  role?: AppRole;
  roleVersion?: number;
}

export interface UserPrivateMetadata {
  accountStatus?: "active" | "suspended" | "restricted";
  accountStatusReason?: string;
}

export type AuthorizationContext = {
  userId?: string;
  clerkUserId: string;
  sessionId: string;
  role: AppRole;
  roleVersion: number;
  roleSource: "owner_allowlist" | "supabase_user_role" | "default_user" | "clerk_public_metadata";
  accountStatus: "active" | "suspended" | "restricted";
  factorVerificationAge: [number, number] | null;
};

function configuredOwnerIds(): string[] {
  return (process.env.SUPABASE_OWNER_USER_ID ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function validRoleVersion(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export function authorizationFromRole(input: { userId: string; sessionId: string; dbRole?: string; roleVersion?: number; accountStatus?: string; factorVerificationAge: [number, number] | null; ownerIds?: readonly string[] }): AuthorizationContext {
  const owner = (input.ownerIds ?? configuredOwnerIds()).includes(input.userId);
  const role = owner ? "owner" : normalizeRole(input.dbRole);
  return {
    userId: input.userId,
    clerkUserId: input.userId,
    sessionId: input.sessionId,
    role,
    roleVersion: validRoleVersion(input.roleVersion) ? input.roleVersion : 1,
    roleSource: owner ? "owner_allowlist" : input.dbRole ? "supabase_user_role" : "default_user",
    accountStatus: input.accountStatus === "suspended" || input.accountStatus === "restricted" ? input.accountStatus : "active",
    factorVerificationAge: input.factorVerificationAge,
  };
}

export function isClerkConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() &&
      process.env.CLERK_SECRET_KEY?.trim(),
  );
}
export function authorizationFromMetadata(input: { clerkUserId: string; sessionId: string; publicMetadata: UserPublicMetadata; privateMetadata: UserPrivateMetadata; factorVerificationAge: [number, number] | null; ownerIds?: readonly string[] }): AuthorizationContext {
  const privileged = normalizeRole(input.publicMetadata.role) !== "user";
  const downgraded = privileged && !validRoleVersion(input.publicMetadata.roleVersion);
  const context = authorizationFromRole({ userId: input.clerkUserId, sessionId: input.sessionId, dbRole: downgraded ? "user" : input.publicMetadata.role, roleVersion: input.publicMetadata.roleVersion, accountStatus: input.privateMetadata.accountStatus, factorVerificationAge: input.factorVerificationAge, ownerIds: input.ownerIds });
  return {
    ...context,
    roleSource: context.role === "owner"
      ? "owner_allowlist"
      : downgraded
        ? "default_user"
        : "clerk_public_metadata",
  };
}

export async function getAuthorizationContext(userId: string, sessionId = "supabase"): Promise<AuthorizationContext> {
  try {
    const { data, error } = await (supabaseAdmin.from("user_roles") as any).select("role, role_version, account_status").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    const context = authorizationFromRole({ userId, sessionId, dbRole: data?.role, roleVersion: data?.role_version, accountStatus: data?.account_status, factorVerificationAge: null });
    if (context.accountStatus === "suspended") throw new AuthorizationError("account_suspended");
    return context;
  } catch (error) {
    if (error instanceof AuthorizationError) throw error;
    throw new AuthorizationError("auth_unavailable");
  }
}

export function hasPermission(context: AuthorizationContext, permission: AppPermission): boolean {
  return context.accountStatus !== "suspended" && roleHasPermission(context.role, permission);
}

export function requirePermission(context: AuthorizationContext, permission: AppPermission): AuthorizationContext {
  if (context.accountStatus === "suspended") throw new AuthorizationError("account_suspended");
  if (!hasPermission(context, permission)) throw new AuthorizationError("forbidden");
  return context;
}

export function requireAnyPermission(
  context: AuthorizationContext,
  permissions: readonly AppPermission[],
): AuthorizationContext {
  if (context.accountStatus === "suspended") throw new AuthorizationError("account_suspended");
  if (!permissions.some((permission) => hasPermission(context, permission))) {
    throw new AuthorizationError("forbidden");
  }
  return context;
}

export function requireOwner(context: AuthorizationContext): AuthorizationContext {
  if (context.role !== "owner") throw new AuthorizationError("forbidden");
  return context;
}

export function requireRecentAuthentication(context: AuthorizationContext, maxAgeMinutes = 15): AuthorizationContext {
  const firstFactorAge = context.factorVerificationAge?.[0];
  if (typeof firstFactorAge !== "number" || firstFactorAge > maxAgeMinutes) {
    throw new AuthorizationError("recent_auth_required");
  }
  return context;
}

export function viewerSnapshot(context: AuthorizationContext) {
  return {
    userId: context.userId,
    role: context.role,
    roleVersion: context.roleVersion,
    roleSource: context.roleSource,
    permissions: permissionsForRole(context.role),
  };
}
