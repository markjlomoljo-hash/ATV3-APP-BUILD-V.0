import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function configured(...names: string[]) {
  return names.some((name) => Boolean(process.env[name]?.trim()));
}

/**
 * Railway deployment liveness endpoint.
 *
 * Keep this intentionally lightweight and dependency-free. Railway uses the
 * configured healthcheck path to decide whether a new container should receive
 * traffic. The full readiness contract, including database schema, Clerk, ML,
 * and worker diagnostics, remains available at /api/health and may return 503
 * when an integration is degraded. This endpoint only proves that the Next.js
 * server booted, is bound to Railway's PORT, and can serve requests.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "acnetrex-v3-web",
    platform: "railway",
    integrations: {
      databaseConfigured: configured("DATABASE_URL"),
      supabaseConfigured: configured("NEXT_PUBLIC_SUPABASE_URL", "VITE_SUPABASE_URL"),
      clerkConfigured: configured("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY") && configured("CLERK_SECRET_KEY"),
      mlConfigured: configured("ACNETREX_ML_API_URL") && configured("ACNETREX_ML_SHARED_SECRET"),
      mlWorkerEnabled: process.env.ACNETREX_ML_WORKER_ENABLED === "true",
    },
    checkedAt: new Date().toISOString(),
  });
}
