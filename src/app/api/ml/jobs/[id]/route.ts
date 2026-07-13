import { NextResponse } from "next/server";
import { z } from "zod";
import { DatabaseConfigurationError } from "@/db";
import { getMlAnalysisJob } from "@/lib/acnetrex/ml-analysis-jobs";
import { classifyDatabaseFailure } from "@/lib/acnetrex/services/database-error-classifier";
import { authenticateSupabaseRequest } from "@/lib/supabase-request-auth";

export const dynamic = "force-dynamic";

const jobIdSchema = z.string().uuid();

export async function GET(request: Request, routeContext: { params: Promise<{ id: string }> }) {
  const auth = await authenticateSupabaseRequest(request);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const { id } = await routeContext.params;
  const parsedId = jobIdSchema.safeParse(id);
  if (!parsedId.success) return NextResponse.json({ ok: false, error: "invalid_job_id" }, { status: 400 });

  try {
    const job = await getMlAnalysisJob({ actorId: auth.userId, jobId: parsedId.data });
    if (!job) return NextResponse.json({ ok: false, error: "analysis_job_not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, job });
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) {
      return NextResponse.json({ ok: false, error: "database_unavailable" }, { status: 503 });
    }
    return NextResponse.json({ ok: false, error: classifyDatabaseFailure(error) }, { status: 503 });
  }
}
