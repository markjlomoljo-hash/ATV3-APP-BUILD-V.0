import type { AppRole } from "./roles";

export const APP_PERMISSIONS = [
  "admin:access",
  "admin:access_limited",
  "users:read",
  "users:read_limited",
  "users:read_support",
  "users:update",
  "users:suspend",
  "sessions:revoke",
  "roles:read",
  "roles:assign_lower",
  "roles:assign_admin",
  "roles:revoke",
  "owner:assign",
  "owner:transfer",
  "analytics:read",
  "analytics:read_aggregate",
  "support:read",
  "support:act",
  "moderation:read",
  "moderation:act",
  "health:read",
  "database:read",
  "deployments:read",
  "security:read",
  "audit:read",
  "feature_flags:read",
  "feature_flags:write",
  "ml:read",
  "ml:manage",
  "models:activate",
  "models:rollback",
  "jobs:read",
  "jobs:retry",
  "jobs:cancel",
  "reports:manage",
  "exports:manage",
  "deletions:manage",
  "deletions:read_status",
  "notifications:manage",
  "research:manage",
  "research:read_aggregate",
  "sensitive_records:request_access",
  "sensitive_records:read",
  "clinical_cases:read",
  "clinical_cases:review",
  "evidence:read",
  "evidence:review",
  "ai_safety:read",
  "ai_safety:review",
] as const;

export type AppPermission = (typeof APP_PERMISSIONS)[number];

const ADMIN_PERMISSIONS: readonly AppPermission[] = [
  "admin:access",
  "admin:access_limited",
  "users:read",
  "users:update",
  "users:suspend",
  "sessions:revoke",
  "roles:read",
  "roles:assign_lower",
  "roles:revoke",
  "analytics:read",
  "analytics:read_aggregate",
  "support:read",
  "support:act",
  "moderation:read",
  "health:read",
  "database:read",
  "deployments:read",
  "security:read",
  "audit:read",
  "feature_flags:read",
  "feature_flags:write",
  "ml:read",
  "jobs:read",
  "jobs:retry",
  "jobs:cancel",
  "reports:manage",
  "exports:manage",
  "deletions:manage",
  "deletions:read_status",
  "notifications:manage",
  "research:read_aggregate",
  "sensitive_records:request_access",
  "clinical_cases:read",
  "evidence:read",
  "ai_safety:read",
];

const ROLE_PERMISSIONS: Record<Exclude<AppRole, "owner">, readonly AppPermission[]> = {
  admin: ADMIN_PERMISSIONS,
  moderator: [
    "admin:access_limited",
    "moderation:read",
    "moderation:act",
    "support:read",
  ],
  support: [
    "admin:access_limited",
    "users:read_limited",
    "users:read_support",
    "sessions:revoke",
    "support:read",
    "support:act",
    "deletions:read_status",
  ],
  analyst: [
    "admin:access_limited",
    "analytics:read_aggregate",
    "research:read_aggregate",
  ],
  clinical_reviewer: [
    "admin:access_limited",
    "clinical_cases:read",
    "clinical_cases:review",
    "evidence:read",
    "evidence:review",
    "ai_safety:read",
    "ai_safety:review",
  ],
  user: [],
};

export function permissionsForRole(role: AppRole): readonly AppPermission[] {
  return role === "owner" ? APP_PERMISSIONS : ROLE_PERMISSIONS[role];
}

export function hasPermission(role: AppRole, permission: AppPermission): boolean {
  return permissionsForRole(role).includes(permission);
}

export function hasAnyPermission(role: AppRole, permissions: readonly AppPermission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}
