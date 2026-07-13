import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  bootstrapOwner,
  getAdminOverview,
  getAdminUser,
  getAuditEvents,
  getDatabaseStatus,
  getJobs,
  getPrivacyRequests,
  getRoleCatalog,
  issueBreakGlass,
  listAdminUsers,
  mutateRole,
  notConfiguredFeature,
  revokeSessions,
  setAccountStatus,
  type AdminReadResult,
} from "@/lib/admin/service";
import {
  requireAnyPermission,
  requirePermission,
  viewerSnapshot,
  type AuthorizationContext,
} from "@/lib/auth/authorization";
import { AuthorizationError } from "@/lib/auth/errors";
import { withAdminPermission } from "@/lib/auth/request";
import { APP_ROLES } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ path: string[] }> };

const userQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().trim().max(200).optional(),
  orderBy: z.enum(["+created_at", "-created_at", "+last_active_at", "-last_active_at"]).default("-created_at"),
}).strict();

const roleMutationSchema = z.object({
  targetUserId: z.string().trim().min(1).max(160),
  targetRole: z.enum(APP_ROLES),
  reason: z.string().trim().min(3).max(1000),
}).strict();

const roleRevokeSchema = z.object({
  targetUserId: z.string().trim().min(1).max(160),
  reason: z.string().trim().min(3).max(1000),
}).strict();

const statusSchema = z.object({
  status: z.enum(["active", "suspended", "restricted"]),
  reason: z.string().trim().min(3).max(1000),
}).strict();

const reasonSchema = z.object({ reason: z.string().trim().min(3).max(1000) }).strict();
const ownerBootstrapSchema = z.object({ reason: z.string().trim().min(10).max(1000) }).strict();

const breakGlassSchema = z.object({
  targetUserId: z.string().trim().min(1).max(160),
  scope: z.enum(["raw_face_scans", "cutisai_conversations", "cycle_records", "treatment_details", "private_reports", "detailed_health_logs"]),
  reason: z.string().trim().min(10).max(1000),
  caseId: z.string().trim().min(3).max(160),
  durationMinutes: z.number().int().min(1).max(60),
}).strict();

function invalidPayload() {
  return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
}

async function body<T>(request: NextRequest, schema: z.ZodType<T>): Promise<T> {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw new AuthorizationError("invalid_payload");
  return parsed.data;
}

function readResponse(result: AdminReadResult<Record<string, unknown>>, context: AuthorizationContext) {
  if (result.ok) {
    return NextResponse.json({ ok: true, viewer: viewerSnapshot(context), data: result.data });
  }
  const status = result.error === "not_found" ? 404 : 503;
  return NextResponse.json({ ok: false, error: result.error }, { status });
}

function unavailableMutation(feature: string) {
  return NextResponse.json({ ok: false, error: "feature_not_configured", feature }, { status: 503 });
}

export const GET = withAdminPermission<RouteContext>(
  "admin:access_limited",
  async (request, context, routeContext) => {
    const path = (await routeContext.params).path;
    const key = path.join("/");

    if (key === "overview") return readResponse(await getAdminOverview(), context);
    if (key === "roles") {
      requirePermission(context, "roles:read");
      return readResponse(await getRoleCatalog(), context);
    }
    if (key === "analytics") {
      requireAnyPermission(context, ["analytics:read", "analytics:read_aggregate"]);
      return readResponse(await getAdminOverview(), context);
    }
    if (key === "database/status") {
      requirePermission(context, "database:read");
      return readResponse(await getDatabaseStatus(), context);
    }
    if (key === "jobs") {
      requirePermission(context, "jobs:read");
      return readResponse(await getJobs(), context);
    }
    if (key === "audit") {
      requirePermission(context, "audit:read");
      return readResponse(await getAuditEvents(), context);
    }
    if (key === "privacy/requests") {
      requireAnyPermission(context, ["deletions:manage", "deletions:read_status"]);
      return readResponse(await getPrivacyRequests(), context);
    }
    if (key === "users") {
      requireAnyPermission(context, ["users:read", "users:read_limited", "users:read_support"]);
      const parsed = userQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
      if (!parsed.success) return invalidPayload();
      return readResponse(await listAdminUsers(parsed.data), context);
    }
    if (path.length === 2 && path[0] === "users") {
      requireAnyPermission(context, ["users:read", "users:read_limited", "users:read_support"]);
      return readResponse(await getAdminUser(context, path[1] ?? ""), context);
    }

    const readOnlyFeatures: Record<string, { permission: Parameters<typeof requirePermission>[1]; feature: string }> = {
      "system/health": { permission: "health:read", feature: "system_health_aggregation" },
      deployments: { permission: "deployments:read", feature: "deployment_provider_adapter" },
      "ml/status": { permission: "ml:read", feature: "ml_operational_telemetry" },
      "ml/models": { permission: "ml:read", feature: "model_registry" },
      reports: { permission: "reports:manage", feature: "report_operations" },
      research: { permission: "research:read_aggregate", feature: "research_operations" },
      notifications: { permission: "notifications:manage", feature: "notification_operations" },
      "feature-flags": { permission: "feature_flags:read", feature: "feature_flag_store" },
      security: { permission: "security:read", feature: "security_event_store" },
      support: { permission: "support:read", feature: "support_case_store" },
      moderation: { permission: "moderation:read", feature: "moderation_queue" },
      clinical: { permission: "clinical_cases:read", feature: "clinical_review_queue" },
    };
    const target = readOnlyFeatures[key];
    if (target) {
      requirePermission(context, target.permission);
      return readResponse(await notConfiguredFeature(target.feature), context);
    }

    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  },
);

export const POST = withAdminPermission<RouteContext>(
  "admin:access_limited",
  async (request, context, routeContext) => {
    const path = (await routeContext.params).path;
    const key = path.join("/");

    if (key === "roles/assign") {
      const input = await body(request, roleMutationSchema);
      const result = await mutateRole(context, { ...input, action: "role_assigned" });
      return NextResponse.json({ ok: true, data: result });
    }
    if (key === "roles/revoke") {
      const input = await body(request, roleRevokeSchema);
      const result = await mutateRole(context, { ...input, targetRole: "user", action: "role_revoked" });
      return NextResponse.json({ ok: true, data: result });
    }
    if (key === "roles/bootstrap-owner") {
      const input = await body(request, ownerBootstrapSchema);
      return NextResponse.json({ ok: true, data: await bootstrapOwner(context, input.reason) });
    }
    if (path.length === 3 && path[0] === "users" && path[2] === "revoke-sessions") {
      const input = await body(request, reasonSchema);
      return NextResponse.json({ ok: true, data: await revokeSessions(context, path[1] ?? "", input.reason) });
    }
    if (key === "privacy/break-glass") {
      const input = await body(request, breakGlassSchema);
      return NextResponse.json({ ok: true, data: await issueBreakGlass(context, input) });
    }
    if (key === "ml/models/activate") {
      requirePermission(context, "models:activate");
      return unavailableMutation("model_activation_adapter");
    }
    if (key === "ml/models/rollback") {
      requirePermission(context, "models:rollback");
      return unavailableMutation("model_rollback_adapter");
    }
    if (path.length === 3 && path[0] === "privacy" && path[1] === "requests" && path[2]) {
      requireAnyPermission(context, ["deletions:manage", "exports:manage"]);
      return unavailableMutation("privacy_request_processor");
    }
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  },
);

export const PATCH = withAdminPermission<RouteContext>(
  "admin:access_limited",
  async (request, context, routeContext) => {
    const path = (await routeContext.params).path;
    if (path.length === 3 && path[0] === "users" && path[2] === "status") {
      const input = await body(request, statusSchema);
      return NextResponse.json({ ok: true, data: await setAccountStatus(context, { targetUserId: path[1] ?? "", ...input }) });
    }
    if (path.length === 2 && path[0] === "feature-flags") {
      requirePermission(context, "feature_flags:write");
      return unavailableMutation("feature_flag_store");
    }
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  },
);
