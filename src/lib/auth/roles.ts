export const APP_ROLES = [
  "owner",
  "admin",
  "moderator",
  "support",
  "analyst",
  "clinical_reviewer",
  "user",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

const LEGACY_ROLE_ALIASES: Record<string, AppRole> = {
  clinician: "clinical_reviewer",
};

export function normalizeRole(value: unknown): AppRole {
  if (typeof value !== "string") return "user";
  if ((APP_ROLES as readonly string[]).includes(value)) return value as AppRole;
  return LEGACY_ROLE_ALIASES[value] ?? "user";
}

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (APP_ROLES as readonly string[]).includes(value);
}

export const ROLE_RANK: Record<AppRole, number> = {
  user: 0,
  analyst: 10,
  support: 20,
  moderator: 30,
  clinical_reviewer: 40,
  admin: 80,
  owner: 100,
};

export function isLowerRole(role: AppRole): boolean {
  return role !== "owner" && role !== "admin";
}
