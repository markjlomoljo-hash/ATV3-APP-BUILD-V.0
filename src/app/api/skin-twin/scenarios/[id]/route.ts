import { NextResponse } from "next/server";
import { z } from "zod";
import { DatabaseConfigurationError } from "@/db";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";
import { classifyDatabaseFailure } from "@/lib/acnetrex/services/database-error-classifier";
import { getSkinTwinScenario } from "@/lib/acnetrex/skin-twin/scenarios";

export const dynamic = "force-dynamic";
const idSchema = z.string().uuid();

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  const id = (await context.params).id;
  if (!idSchema.safeParse(id).success) return NextResponse.json({ ok: false, error: "invalid_scenario_id" }, { status: 400 });
  try {
    const scenario = await getSkinTwinScenario(auth.userId, id);
    return scenario
      ? NextResponse.json({ ok: true, scenario })
      : NextResponse.json({ ok: false, error: "skin_twin_scenario_not_found" }, { status: 404 });
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) return NextResponse.json({ ok: false, error: "database_unavailable" }, { status: 503 });
    return NextResponse.json({ ok: false, error: classifyDatabaseFailure(error) }, { status: 503 });
  }
}
