import "server-only";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { AuthorizationError } from "./errors";
import { hasPermission as roleHasPermission, permissionsForRole, type AppPermission } from "./permissions";
import { normalizeRole, type AppRole } from "./roles";

export type AuthorizationContext = {
  clerkUserId: string;
  sessionId: string;
  role: AppRole;
  roleVersion: number;
  roleSource: "owner_allowlist" | "clerk_public_metadata" | "default_user";
  accountStatus: "active" | "suspended" | "restricted";
  factorVerificationAge: [number, number] | null;
};

export function isClerkConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}

function configuredOwnerIds(): string[] {
  return (process.env.ACNETREX_OWNER_CLERK_USER_ID ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function validRoleVersion(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export function authorizationFromMetadata(input: {
  clerkUserId: string;
  sessionId: string;
  publicMetadata: UserPublicMetadata;
  privateMetadata: UserPrivateMetadata;
  factorVerificationAge: [number, number] | null;
  ownerIds?: readonly string[];
}): AuthorizationContext {
  const owner = (input.ownerIds ?? configuredOwnerIds()).includes(input.clerkUserId);
  const requestedRole = normalizeRole(input.publicMetadata.role);
  const role = owner
    ? "owner"
    : requestedRole !== "user" && !validRoleVersion(input.publicMetadata.roleVersion)
      ? "user"
      : requestedRole;
  const accountStatus = input.privateMetadata.accountStatus === "suspended" || input.privateMetadata.accountStatus === "restricted"
    ? input.privateMetadata.accountStatus
    : "active";

  return {
    clerkUserId: input.clerkUserId,
    sessionId: input.sessionId,
    role,
    roleVersion: validRoleVersion(input.publicMetadata.roleVersion) ? input.publicMetadata.roleVersion : 1,
    roleSource: owner ? "owner_allowlist" : role === "user" && requestedRole !== "user" ? "default_user" : "clerk_public_metadata",
    accountStatus,
    factorVerificationAge: input.factorVerificationAge,
  };
}

export async function getAuthorizationContext(): Promise<AuthorizationContext> {
  if (!isClerkConfigured()) throw new AuthorizationError("auth_not_configured");
  const session = await auth();
  if (!session.userId || !session.sessionId) throw new AuthorizationError("auth_required");

  try {
    const client = await clerkClient();
    const user = await client.users.getUser(session.userId);
    const context = authorizationFromMetadata({
      clerkUserId: session.userId,
      sessionId: session.sessionId,
      publicMetadata: user.publicMetadata,
      privateMetadata: user.privateMetadata,
      factorVerificationAge: session.factorVerificationAge,
    });
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
    clerkUserId: context.clerkUserId,
    role: context.role,
    roleVersion: context.roleVersion,
    roleSource: context.roleSource,
    permissions: permissionsForRole(context.role),
  };
}
