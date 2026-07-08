import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { reportJobs, reports } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { parseJsonBody, withErrorHandling } from "@/lib/http";
import { assembleReportSections } from "@/lib/services/reportService";
import { generateStorageKey, putPrivateObject } from "@/lib/storage";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const jobs = await db
      .select()
      .from(reportJobs)
      .where(eq(reportJobs.userId, auth.ctx.user.id))
      .orderBy(desc(reportJobs.createdAt))
      .limit(30);

    return NextResponse.json({ reportJobs: jobs });
  });
}

const requestReportSchema = z.object({
  windowStart: z.string().datetime().optional(),
  windowEnd: z.string().datetime().optional(),
});

/**
 * Generates a dermatologist-ready report synchronously from real stored
 * data. Sections lacking sufficient data are explicitly labeled
 * insufficient_data rather than fabricated or silently dropped.
 */
export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;

    const parsed = await parseJsonBody(req, requestReportSchema);
    if ("error" in parsed) return parsed.error;

    const windowEnd = parsed.data.windowEnd ? new Date(parsed.data.windowEnd) : new Date();
    const windowStart = parsed.data.windowStart
      ? new Date(parsed.data.windowStart)
      : new Date(windowEnd.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [job] = await db
      .insert(reportJobs)
      .values({ userId, status: "processing", windowStart, windowEnd })
      .returning();

    try {
      const sections = await assembleReportSections(userId, windowStart, windowEnd);
      const included = sections.filter((s) => s.status === "included").map((s) => s.key);
      const insufficient = sections.filter((s) => s.status === "insufficient_data").map((s) => s.key);

      const reportPayload = {
        generatedAt: new Date().toISOString(),
        windowStart,
        windowEnd,
        sections,
        disclaimer:
          "This report summarizes self-reported and app-tracked data. It is not a medical diagnosis and does not replace professional evaluation.",
      };

      const storageKey = generateStorageKey("reports", userId, "json");
      await putPrivateObject(storageKey, Buffer.from(JSON.stringify(reportPayload, null, 2)));

      const [report] = await db
        .insert(reports)
        .values({
          reportJobId: job.id,
          userId,
          storageKey,
          sectionsIncluded: included,
          sectionsInsufficientData: insufficient,
        })
        .returning();

      await db
        .update(reportJobs)
        .set({ status: included.length > 0 ? "complete" : "insufficient_data", completedAt: new Date() })
        .where(eq(reportJobs.id, job.id));

      await writeAuditLog({ userId, action: "report.generated", resourceType: "report", resourceId: report.id });

      return NextResponse.json({ reportJob: { ...job, status: "complete" }, report }, { status: 201 });
    } catch (err) {
      await db
        .update(reportJobs)
        .set({ status: "failed", errorMessage: err instanceof Error ? err.message : "unknown_error", completedAt: new Date() })
        .where(eq(reportJobs.id, job.id));
      throw err;
    }
  });
}
