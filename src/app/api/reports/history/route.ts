import { NextResponse } from "next/server";
import { withSession } from "@/lib/session";
import { listReportHistory } from "@/lib/reports/service";

export const dynamic = "force-dynamic";

export const GET = withSession(async (_req, { userId }) => {
  const history = await listReportHistory(userId);
  return NextResponse.json({ ok: true, history });
});
