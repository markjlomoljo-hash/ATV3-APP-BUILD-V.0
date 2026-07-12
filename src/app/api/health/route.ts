import { getDb, isDatabaseConfigurationError } from "@/db";
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

function databaseErrorCodes(error: unknown, depth = 0): string[] {
  if (!isObject(error) || depth > 2) return [];
  const own = typeof error.code === "string" ? [error.code] : [];
  const nested = Array.isArray(error.errors)
    ? error.errors.flatMap((item) => databaseErrorCodes(item, depth + 1))
    : [];
  const caused = "cause" in error ? databaseErrorCodes(error.cause, depth + 1) : [];
  return [...new Set([...own, ...nested, ...caused])];
}

function classifyDatabaseFailure(error: unknown) {
  const codes = databaseErrorCodes(error);
  if (codes.some((code) => code === "28P01" || code === "28000")) return "authentication_failed";
  if (codes.some((code) => code === "ENOTFOUND" || code === "EAI_AGAIN")) return "dns_failed";
  if (codes.includes("ECONNREFUSED")) return "connection_refused";
  if (codes.some((code) => code === "ETIMEDOUT" || code === "ETIME")) return "connection_timeout";
  if (codes.includes("3D000")) return "database_missing";
  if (codes.some((code) => code.startsWith("CERT_") || code.includes("TLS") || code.includes("SSL"))) {
    return "tls_failed";
  }
  if (isObject(error) && error.name === "TypeError") return "connection_string_invalid";
  return "connection_failed";
}

async function checkCloudRunHealth() {
  const baseUrl = process.env.ACNETREX_ML_API_URL ?? process.env.NEXT_PUBLIC_ACNETREX_ML_API_URL;

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
    supabaseUrl: envConfigured("VITE_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"),
    supabasePublicKey: envConfigured(
      "VITE_SUPABASE_ANON_KEY",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    ),
    mlApiUrl: envConfigured("ACNETREX_ML_API_URL", "NEXT_PUBLIC_ACNETREX_ML_API_URL"),
    vertexEndpoint: envConfigured("VERTEX_AI_ENDPOINT_ID"),
    vercel: envConfigured("VERCEL", "VERCEL_ENV"),
  };

  const cloudRun = await checkCloudRunHealth();

  try {
    const db = getDb();
    
    // Enhanced error logging
    let connectionError: unknown = null;
    try {
      await db.execute(sql`select 1`);
    } catch (err) {
      connectionError = err;
      // Log for debugging
      const errorObj = err as any;
      console.error("Database connection test failed:", {
        name: errorObj?.name,
        message: errorObj?.message,
        code: errorObj?.code,
        errno: errorObj?.errno,
        syscall: errorObj?.syscall,
      });
      throw err;
    }

    const tableRows = await db.execute<{ table_name: string }>(sql`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
    `);
    const schema = summarizeDatabaseSchema(tableRows.rows.map((row) => row.table_name));
    const schemaReady = schema.status === "ready";
    const mlReady = cloudRun.status === "healthy" || cloudRun.status === "not_configured";
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
        cloudRun,
        warnings: [
          ...schema.warnings,
          ...(cloudRun.status === "not_configured" ? ["ml_api_not_configured"] : []),
          ...(cloudRun.status === "offline" || cloudRun.status === "timeout" ? ["ml_api_unreachable"] : []),
          ...(cloudRun.status === "degraded" ? ["ml_api_degraded"] : []),
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
          cloudRun,
          updatedAt: new Date().toISOString(),
        },
        { status: 503 },
      );
    }

    const failureCategory = classifyDatabaseFailure(error);
    const errorObj = error as any;
    
    return Response.json(
      {
        ok: false,
        error: "database_unavailable",
        app: "acnetrex-v3",
        database: {
          configured: true,
          status: "unavailable",
          failureCategory,
          errorDetails: {
            code: errorObj?.code,
            errno: errorObj?.errno,
            syscall: errorObj?.syscall,
            message: errorObj?.message?.substring(0, 200), // Truncate long messages
          },
        },
        environment,
        cloudRun,
        updatedAt: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
