import { NextResponse } from "next/server";
import { DatabaseConfigurationError } from "@/db";
import { withSession } from "@/lib/session";
import { reportRequestSchema } from "@/lib/validation";
import { createAndProcessReport } from "@/lib/reports/service";
import { classifyDatabaseFailure } from "@/lib/acnetrex/services/database-error-classifier";

export const dynamic = "force-dynamic";

export const POST = withSession(async (req, { userId }) => {
  let body: unknown = {};
  try {
    const text = await req.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = reportRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  let result: Awaited<ReturnType<typeof createAndProcessReport>>;
  try {
    result = await createAndProcessReport(
      userId,
      parsed.data.inclusionOptions,
      parsed.data.idempotencyKey,
    );
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) {
      return NextResponse.json({ ok: false, error: "database_unavailable" }, { status: 503 });
    }
    return NextResponse.json({ ok: false, error: classifyDatabaseFailure(error) }, { status: 503 });
  }

  if (result.status === "failed") {
    return NextResponse.json(
      { ok: false, error: "report_generation_failed", ...result },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, ...result }, { status: 201 });
});
