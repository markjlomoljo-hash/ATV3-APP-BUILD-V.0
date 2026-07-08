import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { reports } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { notFound, withErrorHandling } from "@/lib/http";
import { getPrivateObject } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const { id } = await params;

    const [report] = await db
      .select()
      .from(reports)
      .where(and(eq(reports.id, id), eq(reports.userId, auth.ctx.user.id)))
      .limit(1);
    if (!report || !report.storageKey) return notFound("Report");

    const bytes = await getPrivateObject(report.storageKey);
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="acnetrex-report-${id}.json"`,
        "Cache-Control": "private, no-store",
      },
    });
  });
}
