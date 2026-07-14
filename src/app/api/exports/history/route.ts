import { NextResponse } from "next/server";
import { withSession } from "@/lib/session";
import { listExportHistory } from "@/lib/exports/service";

export const dynamic = "force-dynamic";

export const GET = withSession(async (_req, { userId }) => {
  const history = await listExportHistory(userId);
  return NextResponse.json({ ok: true, history });
});
