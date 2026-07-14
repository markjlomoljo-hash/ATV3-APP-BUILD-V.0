import { NextResponse } from "next/server";
import { withSession } from "@/lib/session";
import { getExportMetadata } from "@/lib/exports/service";

export const dynamic = "force-dynamic";

export const GET = withSession<{ params: Promise<{ id: string }> }>(async (_req, { userId }, routeCtx) => {
  const { id } = await routeCtx.params;
  const metadata = await getExportMetadata(userId, id);
  if (!metadata) {
    return NextResponse.json({ ok: false, error: "Export not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, export: metadata });
});
