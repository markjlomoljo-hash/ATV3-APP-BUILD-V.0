import { getPool } from "@/db";
import {
  classifyCloudRunHealthPayload,
  cloudRunHealthTimeoutMs,
  cloudRunReadinessUrl,
} from "@/lib/acnetrex/services/infrastructure-health";

export const dynamic = "force-dynamic";

async function mlStatus(): Promise<"healthy" | "degraded" | "offline" | "not_configured"> {
  const baseUrl = process.env.ACNETREX_ML_API_URL;
  if (!baseUrl) return "not_configured";
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    cloudRunHealthTimeoutMs(process.env.ML_HEALTH_TIMEOUT_MS),
  );
  try {
    const response = await fetch(cloudRunReadinessUrl(baseUrl), {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    const payload = response.headers.get("content-type")?.includes("application/json")
      ? await response.json().catch(() => null)
      : null;
    return response.ok && classifyCloudRunHealthPayload(payload).healthy ? "healthy" : "degraded";
  } catch {
    return "offline";
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  const ml = await mlStatus();
  let database: "connected" | "unavailable" | "not_configured" = "connected";
  try {
    await getPool().query("select 1");
  } catch (error) {
    database = error instanceof Error && error.message.includes("DATABASE_URL")
      ? "not_configured"
      : "unavailable";
  }
  const ok = database === "connected" && ml === "healthy";
  return Response.json(
    {
      ok,
      app: "acnetrex-v3",
      database: { status: database },
      ml: { status: ml },
      updatedAt: new Date().toISOString(),
    },
    { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
