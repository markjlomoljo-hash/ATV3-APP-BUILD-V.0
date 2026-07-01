import { NextResponse } from "next/server";
import { withSession } from "@/lib/session";
import { getReportFileBuffer } from "@/lib/reports/service";

export const dynamic = "force-dynamic";

// Ownership is enforced inside getReportFileBuffer (query is scoped by both
// report id AND session userId), so this never allows cross-user access —
// standing in for a private, signed object-storage download URL.
export const GET = withSession<{ params: Promise<{ id: string }> }>(async (_req, { userId }, routeCtx) => {
  const { id } = await routeCtx.params;
  const buffer = await getReportFileBuffer(userId, id);
  if (!buffer) {
    return NextResponse.json({ ok: false, error: "Report not available" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="acnetrex-dermatologist-report-${id}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
});
