import { timingSafeEqual } from "node:crypto";
import { GET as publicHealth } from "../../health/route";

export const dynamic = "force-dynamic";

function configured(...names: string[]) {
  return names.some((name) => Boolean(process.env[name]?.trim()));
}

function secretMatches(expected: string, received: string | null): boolean {
  if (!expected || !received) return false;
  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(received);
  return expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes);
}

function receivedSecret(request: Request): string | null {
  const direct = request.headers.get("x-internal-health-secret");
  if (direct) return direct;
  const authorization = request.headers.get("authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() || null : null;
}

export async function GET(request: Request) {
  const expected = process.env.ACNETREX_INTERNAL_HEALTH_SECRET?.trim() ?? "";
  if (!expected) {
    return Response.json({ ok: false, error: "health_not_configured" }, { status: 503 });
  }
  if (!secretMatches(expected, receivedSecret(request))) {
    return Response.json({ ok: false, error: "health_auth_required" }, { status: 401 });
  }

  const publicResponse = await publicHealth();
  const health = await publicResponse.json();
  return Response.json(
    {
      ...health,
      environment: {
        databaseUrl: configured("DATABASE_URL"),
        databaseCaCert: configured("SUPABASE_DB_CA_CERT"),
        supabaseUrl: configured("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "VITE_SUPABASE_URL"),
        supabasePublicKey: configured(
          "SUPABASE_PUBLISHABLE_KEY",
          "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
          "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        ),
        clerkPublishableKey: configured("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
        clerkSecretKey: configured("CLERK_SECRET_KEY"),
        mlApiUrl: configured("ACNETREX_ML_API_URL"),
        mlWorkerSecret: configured("ACNETREX_ML_WORKER_SECRET"),
        mlWorkerEnabled: process.env.ACNETREX_ML_WORKER_ENABLED === "true",
        vertexEndpoint: configured("VERTEX_AI_ENDPOINT_ID"),
      },
    },
    { status: publicResponse.status, headers: { "cache-control": "no-store" } },
  );
}
