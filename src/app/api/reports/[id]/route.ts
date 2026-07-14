import { NextResponse } from "next/server";
import { DatabaseConfigurationError } from "@/db";
import { withSession } from "@/lib/session";
import { getReportMetadata } from "@/lib/reports/service";
import { classifyDatabaseFailure } from "@/lib/acnetrex/services/database-error-classifier";

export const dynamic = "force-dynamic";

export const GET = withSession<{ params: Promise<{ id: string }> }>(async (_req, { userId }, routeCtx) => {
  const { id } = await routeCtx.params;
  let metadata;
  try {
    metadata = await getReportMetadata(userId, id);
  } catch (error) {
    const reason = error instanceof DatabaseConfigurationError ? "database_unavailable" : classifyDatabaseFailure(error);
    return NextResponse.json({ ok: false, error: reason }, { status: 503 });
  }
  if (!metadata) {
    return NextResponse.json({ ok: false, error: "Report not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, report: metadata });
});
