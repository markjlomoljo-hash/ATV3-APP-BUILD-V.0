export type AuthorizationErrorCode =
  | "auth_required"
  | "auth_not_configured"
  | "auth_unavailable"
  | "forbidden"
  | "account_suspended"
  | "invalid_role"
  | "invalid_target"
  | "invalid_payload"
  | "owner_protected"
  | "self_change_forbidden"
  | "recent_auth_required"
  | "rate_limited"
  | "role_update_failed"
  | "audit_unavailable"
  | "migration_missing"
  | "database_not_configured"
  | "database_unavailable"
  | "feature_not_configured";

const STATUS: Record<AuthorizationErrorCode, number> = {
  auth_required: 401,
  auth_not_configured: 503,
  auth_unavailable: 503,
  forbidden: 403,
  account_suspended: 403,
  invalid_role: 400,
  invalid_target: 400,
  invalid_payload: 400,
  owner_protected: 409,
  self_change_forbidden: 409,
  recent_auth_required: 428,
  rate_limited: 429,
  role_update_failed: 503,
  audit_unavailable: 503,
  migration_missing: 503,
  database_not_configured: 503,
  database_unavailable: 503,
  feature_not_configured: 503,
};

export class AuthorizationError extends Error {
  readonly code: AuthorizationErrorCode;
  readonly status: number;

  constructor(code: AuthorizationErrorCode) {
    super(code);
    this.name = "AuthorizationError";
    this.code = code;
    this.status = STATUS[code];
  }
}

export function asAuthorizationError(error: unknown): AuthorizationError {
  return error instanceof AuthorizationError ? error : new AuthorizationError("forbidden");
}
