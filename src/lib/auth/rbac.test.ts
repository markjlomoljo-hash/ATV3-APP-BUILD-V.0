import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn(), clerkClient: vi.fn() }));

import {
  authorizationFromMetadata,
  hasPermission,
  isClerkConfigured,
  requirePermission,
  requireRecentAuthentication,
  type AuthorizationContext,
  type UserPrivateMetadata,
  type UserPublicMetadata,
} from "./authorization";
import { AuthorizationError } from "./errors";
import { permissionsForRole } from "./permissions";
import { consumeRateLimit, resetRateLimitsForTests } from "./rate-limit";
import { normalizeRole } from "./roles";

function context(overrides: Partial<AuthorizationContext> = {}): AuthorizationContext {
  return {
    clerkUserId: "user_test123",
    sessionId: "sess_test123",
    role: "user",
    roleVersion: 1,
    roleSource: "clerk_public_metadata",
    accountStatus: "active",
    factorVerificationAge: [1, -1],
    ...overrides,
  };
}

describe("Clerk RBAC policy", () => {
  beforeEach(() => resetRateLimitsForTests());

  it("resolves missing and unknown roles to user", () => {
    expect(normalizeRole(undefined)).toBe("user");
    expect(normalizeRole("superadmin")).toBe("user");
  });

  it("exports Clerk metadata contracts and reflects real Clerk configuration", () => {
    const publicMetadata: UserPublicMetadata = { role: "admin", roleVersion: 2 };
    const privateMetadata: UserPrivateMetadata = { accountStatus: "active" };
    expect(publicMetadata.role).toBe("admin");
    expect(privateMetadata.accountStatus).toBe("active");

    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_configured");
    vi.stubEnv("CLERK_SECRET_KEY", "configured-clerk-secret");
    expect(isClerkConfigured()).toBe(true);

    vi.stubEnv("CLERK_SECRET_KEY", "");
    expect(isClerkConfigured()).toBe(false);
  });

  it("rejects privileged metadata without a valid roleVersion", () => {
    const result = authorizationFromMetadata({
      clerkUserId: "user_test123",
      sessionId: "sess_test123",
      publicMetadata: { role: "admin" },
      privateMetadata: {},
      factorVerificationAge: [1, -1],
      ownerIds: [],
    });
    expect(result.role).toBe("user");
    expect(result.roleSource).toBe("default_user");
  });

  it("recognizes only the server-side owner allowlist as bootstrap owner", () => {
    const result = authorizationFromMetadata({
      clerkUserId: "user_owner123",
      sessionId: "sess_test123",
      publicMetadata: {},
      privateMetadata: {},
      factorVerificationAge: [1, -1],
      ownerIds: ["user_owner123"],
    });
    expect(result.role).toBe("owner");
    expect(result.roleSource).toBe("owner_allowlist");
  });

  it("recognizes versioned admin metadata", () => {
    const result = authorizationFromMetadata({
      clerkUserId: "user_admin123",
      sessionId: "sess_test123",
      publicMetadata: { role: "admin", roleVersion: 3 },
      privateMetadata: {},
      factorVerificationAge: [1, -1],
      ownerIds: [],
    });
    expect(result.role).toBe("admin");
    expect(result.roleVersion).toBe(3);
  });

  it("denies moderator and user access to admin-only actions", () => {
    expect(() => requirePermission(context({ role: "moderator" }), "users:suspend")).toThrowError(AuthorizationError);
    expect(() => requirePermission(context(), "admin:access_limited")).toThrowError(AuthorizationError);
  });

  it("keeps support away from sensitive records by default", () => {
    const support = context({ role: "support" });
    expect(hasPermission(support, "users:read_support")).toBe(true);
    expect(hasPermission(support, "sensitive_records:read")).toBe(false);
  });

  it("limits analysts to aggregate analytics", () => {
    const permissions = permissionsForRole("analyst");
    expect(permissions).toContain("analytics:read_aggregate");
    expect(permissions).not.toContain("users:read");
    expect(permissions).not.toContain("sensitive_records:read");
  });

  it("requires recent authentication for owner-grade mutations", () => {
    expect(() => requireRecentAuthentication(context({ role: "owner", factorVerificationAge: [16, -1] }))).toThrowError("recent_auth_required");
    expect(requireRecentAuthentication(context({ role: "owner", factorVerificationAge: [15, -1] })).role).toBe("owner");
  });

  it("rate-limits repeated sensitive operations", () => {
    expect(consumeRateLimit("role:user_test123", 2, 60_000).allowed).toBe(true);
    expect(consumeRateLimit("role:user_test123", 2, 60_000).allowed).toBe(true);
    expect(consumeRateLimit("role:user_test123", 2, 60_000).allowed).toBe(false);
  });
});
