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

function classifyDatabaseFailure(error: unknown) {
  const code = isObject(error) && typeof error.code === "string" ? error.code : "";
  if (code === "28P01" || code === "28000") return "authentication_failed";
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return "dns_failed";
  if (code === "ECONNREFUSED") return "connection_refused";
  if (code === "ETIMEDOUT" || code === "ETIME") return "connection_timeout";
  if (code === "3D000") return "database_missing";
  if (code.startsWith("CERT_") || code.includes("TLS") || code.includes("SSL")) return "tls_failed";
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
    await db.execute(sql`select 1`);

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

    return Response.json(
      {
        ok: false,
        error: "database_unavailable",
        app: "acnetrex-v3",
        database: {
          configured: true,
          status: "unavailable",
          failureCategory: classifyDatabaseFailure(error),
        },
        environment,
        cloudRun,
        updatedAt: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
