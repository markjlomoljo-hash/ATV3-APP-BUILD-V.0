import { NextRequest, NextResponse } from "next/server";
import { asAuthorizationError, AuthorizationError } from "./errors";
import { getAuthorizationContext, requirePermission, type AuthorizationContext } from "./authorization";
import type { AppPermission } from "./permissions";

export type AdminRouteContext = { params?: unknown };

export function authorizationErrorResponse(error: unknown): NextResponse {
  const safeError = asAuthorizationError(error);
  return NextResponse.json(
    { ok: false, error: safeError.code },
    safeError.code === "rate_limited"
      ? { status: safeError.status, headers: { "retry-after": "60" } }
      : { status: safeError.status },
  );
}

export function withAdminPermission<T extends AdminRouteContext = AdminRouteContext>(
  permission: AppPermission,
  handler: (request: NextRequest, context: AuthorizationContext, routeContext: T) => Promise<NextResponse>,
) {
  return async (request: NextRequest, routeContext: T): Promise<NextResponse> => {
    try {
      const context = await getAuthorizationContext();
      requirePermission(context, permission);
      return await handler(request, context, routeContext);
    } catch (error) {
      if (error instanceof AuthorizationError) return authorizationErrorResponse(error);
      return authorizationErrorResponse(new AuthorizationError("auth_unavailable"));
    }
  };
}
