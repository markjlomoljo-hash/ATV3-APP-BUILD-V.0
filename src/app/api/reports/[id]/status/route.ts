import { NextResponse } from "next/server";
import { withSession } from "@/lib/session";
import { getReportMetadata } from "@/lib/reports/service";

export const dynamic = "force-dynamic";

export const GET = withSession<{ params: Promise<{ id: string }> }>(async (_req, { userId }, routeCtx) => {
  const { id } = await routeCtx.params;
  const metadata = await getReportMetadata(userId, id);
  if (!metadata) {
    return NextResponse.json({ ok: false, error: "Report not found" }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    status: metadata.status,
    failureReason: metadata.failureReason,
  });
});
