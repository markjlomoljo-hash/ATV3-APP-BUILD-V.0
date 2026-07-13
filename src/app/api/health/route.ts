import {
  getDb,
  getPool,
  isDatabaseConfigurationError,
  isDatabaseTlsConfigurationError,
} from "@/db";
import {
  classifyCloudRunHealthPayload,
  summarizeDatabaseSchema,
} from "@/lib/acnetrex/services/infrastructure-health";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

function envConfigured(...names: string[]) {
  return names.some((name) => Boolean(process.env[name]));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Recursively extract error codes from nested error structures
 * (handles both error.cause chains and AggregateError.errors)
 */
function extractErrorCodes(error: unknown, depth = 0, codes: Set<string> = new Set()): Set<string> {
  if (depth > 5 || !isObject(error)) return codes;

  // Extract code
  if (typeof error.code === "string") {
    codes.add(error.code);
  }

  // Extract errno
  if (typeof error.errno === "number") {
    codes.add(`errno_${error.errno}`);
  }

  // Extract syscall
  if (typeof error.syscall === "string") {
    codes.add(`syscall_${error.syscall}`);
  }

  // Recurse into error.cause
  if ("cause" in error) {
    extractErrorCodes(error.cause, depth + 1, codes);
  }

  // Recurse into AggregateError.errors
  if (Array.isArray(error.errors)) {
    error.errors.forEach((item) => {
      extractErrorCodes(item, depth + 1, codes);
    });
  }

  return codes;
}

/**
 * Extract safe diagnostic fields from an error object
 */
function extractErrorDiagnostics(error: unknown): {
  code?: string;
  errno?: number;
  syscall?: string;
  name?: string;
} {
  const result: Record<string, unknown> = {};

  const traverse = (err: unknown, depth = 0) => {
    if (depth > 5 || !isObject(err)) return;

    if (typeof err.code === "string" && !result.code) {
      result.code = err.code;
    }
    if (typeof err.errno === "number" && !result.errno) {
      result.errno = err.errno;
    }
    if (typeof err.syscall === "string" && !result.syscall) {
      result.syscall = err.syscall;
    }
    if (typeof err.name === "string" && !result.name) {
      result.name = err.name;
    }

    if ("cause" in err) {
      traverse(err.cause, depth + 1);
    }

    if (Array.isArray(err.errors)) {
      err.errors.forEach((item) => {
        traverse(item, depth + 1);
      });
    }
  };

  traverse(error);
  return result as any;
}

function classifyDatabaseFailure(errorCodes: Set<string>): string {
  if (errorCodes.has("28P01") || errorCodes.has("28000")) return "authentication_failed";
  if (errorCodes.has("ENOTFOUND") || errorCodes.has("EAI_AGAIN")) return "dns_failed";
  if (errorCodes.has("ECONNREFUSED")) return "connection_refused";
  if (errorCodes.has("ETIMEDOUT") || errorCodes.has("ETIME")) return "connection_timeout";
  if (errorCodes.has("3D000")) return "database_missing";
  if (
    [...errorCodes].some((code) => {
      const normalized = code.toUpperCase();
      return normalized.includes("CERT") || normalized.includes("TLS") || normalized.includes("SSL");
    })
  ) {
    return "tls_failed";
  }
  return "connection_failed";
}

async function checkCloudRunHealth() {
  const baseUrl = process.env.ACNETREX_ML_API_URL;

  if (!baseUrl) {
    return { configured: false, status: "not_configured" as const };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2_500);

  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/health`, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json") ? await response.json().catch(() => null) : null;

    const healthPayload = classifyCloudRunHealthPayload(payload);

    return {
      configured: true,
      status: response.ok && healthPayload.healthy ? ("healthy" as const) : ("degraded" as const),
      httpStatus: response.status,
      json: Boolean(payload),
      service: isObject(payload) && "service" in payload ? payload.service : undefined,
      reason: healthPayload.reason,
      receivedKeys: isObject(payload) ? Object.keys(payload).sort() : [],
    };
  } catch (error) {
    return {
      configured: true,
      status: error instanceof DOMException && error.name === "AbortError" ? ("timeout" as const) : ("offline" as const),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  const environment = {
    databaseUrl: envConfigured("DATABASE_URL"),
    databaseCaCert: envConfigured("SUPABASE_DB_CA_CERT"),
    supabaseUrl: envConfigured("VITE_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"),
    supabasePublicKey: envConfigured(
      "VITE_SUPABASE_ANON_KEY",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    ),
    mlApiUrl: envConfigured("ACNETREX_ML_API_URL"),
    vertexEndpoint: envConfigured("VERTEX_AI_ENDPOINT_ID"),
    vercel: envConfigured("VERCEL", "VERCEL_ENV"),
    clerkPublishableKey: envConfigured("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
    clerkSecretKey: envConfigured("CLERK_SECRET_KEY"),
    clerkOwnerBootstrap: envConfigured("ACNETREX_OWNER_CLERK_USER_ID"),
  };

  const clerkConfigured = environment.clerkPublishableKey && environment.clerkSecretKey;
  const clerkBase = {
    configured: clerkConfigured,
    status: clerkConfigured ? ("configured" as const) : ("not_configured" as const),
    githubSignIn: clerkConfigured ? ("dashboard_verification_required" as const) : ("not_configured" as const),
    sessionClaims: clerkConfigured ? ("owner_action_required" as const) : ("not_configured" as const),
    ownerBootstrap: environment.clerkOwnerBootstrap ? ("configured" as const) : ("owner_action_required" as const),
  };

  const cloudRun = await checkCloudRunHealth();

  try {
    // Bypass Drizzle for connectivity probe: test directly with pg.Pool
    try {
      const pool = getPool();
      await pool.query("select 1");
    } catch (err) {
      // Log for debugging (server-side only)
      const diagnostics = extractErrorDiagnostics(err);
      const errorCodes = extractErrorCodes(err);
      console.error("Database connection probe failed:", {
        diagnostics,
        codes: [...errorCodes],
      });
      throw err;
    }

    // If pool.query succeeded, proceed with Drizzle schema check
    const db = getDb();
    const tableRows = await db.execute<{ table_name: string }>(sql`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
    `);
    const tableNames = tableRows.rows.map((row) => row.table_name);
    const schema = summarizeDatabaseSchema(tableNames);
    const rbacTables = ["clerk_identity_map", "clerk_role_history", "admin_break_glass_sessions", "audit_logs"];
    const missingRbacTables = rbacTables.filter((table) => !tableNames.includes(table));
    const schemaReady = schema.status === "ready";
    // The Expo/FastAPI/Supabase contract is authoritative. The old Drizzle
    // compatibility tables are intentionally not created as duplicate sources
    // of health data and must never block mobile production readiness.
    const mlReady = cloudRun.status === "healthy";
    const ok = schemaReady && mlReady;

    return Response.json(
      {
        ok,
        app: "acnetrex-v3",
        database: {
          configured: true,
          status: schema.status === "ready" ? "connected" : schema.status,
          schema,
        },
        environment,
        clerk: {
          ...clerkBase,
          rbac: {
            status: missingRbacTables.length === 0 ? "ready" : "migration_missing",
            requiredTables: rbacTables,
            missingTables: missingRbacTables,
          },
        },
        cloudRun,
        warnings: [
          ...schema.warnings,
          ...(cloudRun.status === "not_configured" ? ["ml_api_not_configured"] : []),
          ...(cloudRun.status === "offline" || cloudRun.status === "timeout" ? ["ml_api_unreachable"] : []),
          ...(cloudRun.status === "degraded" ? ["ml_api_degraded"] : []),
          ...(!clerkConfigured ? ["clerk_not_configured"] : []),
          ...(missingRbacTables.length > 0 ? ["clerk_rbac_migration_missing"] : []),
        ],
        updatedAt: new Date().toISOString(),
      },
      { status: ok ? 200 : 503 },
    );
  } catch (error) {
    if (isDatabaseConfigurationError(error)) {
      return Response.json(
        {
          ok: false,
          error: "database_not_configured",
          app: "acnetrex-v3",
          database: { configured: false, status: "not_configured" },
          environment,
          clerk: clerkBase,
          cloudRun,
          updatedAt: new Date().toISOString(),
        },
        { status: 503 },
      );
    }

    if (isDatabaseTlsConfigurationError(error)) {
      return Response.json(
        {
          ok: false,
          error: "database_unavailable",
          app: "acnetrex-v3",
          database: {
            configured: true,
            status: "unavailable",
            failureCategory: "tls_configuration_invalid",
          },
          environment,
          clerk: clerkBase,
          cloudRun,
          updatedAt: new Date().toISOString(),
        },
        { status: 503 },
      );
    }

    // Extract diagnostic info from nested error chain
    const errorCodes = extractErrorCodes(error);
    const errorDiagnostics = extractErrorDiagnostics(error);
    const failureCategory = classifyDatabaseFailure(errorCodes);

    return Response.json(
      {
        ok: false,
        error: "database_unavailable",
        app: "acnetrex-v3",
        database: {
          configured: true,
          status: "unavailable",
          failureCategory,
          errorDiagnostics,
        },
        environment,
        clerk: clerkBase,
        cloudRun,
        updatedAt: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
