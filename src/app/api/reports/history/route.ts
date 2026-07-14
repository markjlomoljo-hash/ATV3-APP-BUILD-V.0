import { NextResponse } from "next/server";
import { DatabaseConfigurationError } from "@/db";
import { withSession } from "@/lib/session";
import { listReportHistory } from "@/lib/reports/service";
import { classifyDatabaseFailure } from "@/lib/acnetrex/services/database-error-classifier";

export const dynamic = "force-dynamic";

export const GET = withSession(async (_req, { userId }) => {
  try {
    const history = await listReportHistory(userId);
    return NextResponse.json({ ok: true, history });
  } catch (error) {
    const reason = error instanceof DatabaseConfigurationError ? "database_unavailable" : classifyDatabaseFailure(error);
    return NextResponse.json({ ok: false, error: reason }, { status: 503 });
  }
});
