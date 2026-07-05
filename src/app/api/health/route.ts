import { getDb, isDatabaseConfigurationError } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const criticalTables = [
  "users",
  "consent_settings",
  "profile_sections",
  "daily_logs",
  "face_atlas_scans",
  "treatment_plans",
  "treatment_checkins",
  "trigger_hypotheses",
  "forecast_summaries",
  "report_requests",
  "report_files",
  "deletion_requests",
  "ml_runtime_events",
] as const;

function envConfigured(...names: string[]) {
  return names.some((name) => Boolean(process.env[name]));
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

    return {
      configured: true,
      status: response.ok && payload ? ("healthy" as const) : ("degraded" as const),
      httpStatus: response.status,
      json: Boolean(payload),
      service: payload && typeof payload === "object" && "service" in payload ? payload.service : undefined,
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
    const presentTables = new Set(tableRows.rows.map((row) => row.table_name));
    const missingTables = criticalTables.filter((table) => !presentTables.has(table));

    return Response.json({
      ok: missingTables.length === 0 && (cloudRun.status === "healthy" || cloudRun.status === "not_configured"),
      app: "acnetrex-v3",
      database: {
        configured: true,
        status: "connected",
        criticalTablesPresent: criticalTables.length - missingTables.length,
        criticalTablesExpected: criticalTables.length,
        missingTables,
      },
      environment,
      cloudRun,
      warnings: [
        ...(missingTables.length > 0 ? ["critical_tables_missing"] : []),
        ...(cloudRun.status === "not_configured" ? ["ml_api_not_configured"] : []),
        ...(cloudRun.status === "offline" || cloudRun.status === "timeout" ? ["ml_api_unreachable"] : []),
      ],
      updatedAt: new Date().toISOString(),
    });
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
        database: { configured: true, status: "unavailable" },
        environment,
        cloudRun,
        updatedAt: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
