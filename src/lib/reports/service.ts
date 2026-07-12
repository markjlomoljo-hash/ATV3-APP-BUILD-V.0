import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  dailyLogs,
  faceAtlasScans,
  forecastSummaries,
  reportConsentSnapshots,
  reportFiles,
  reportJobs,
  reportRequests,
  treatmentCheckins,
  treatmentPlans,
  triggerHypotheses,
  users,
} from "@/db/schema";
import { ReportInclusionOptions, ReportMetadata } from "@/types/profile";
import { getSectionRecords } from "@/lib/profile/aggregate";
import { getProfessionalProfile } from "@/lib/profile/aggregate";
import { buildReportStorageRef, putObject, getObject } from "@/lib/storage";
import { compileReportData } from "./compile";
import { renderReportPdf } from "./pdf";
import { RawProfileBundle } from "./types";
import { recordProfileAuditEvent } from "@/lib/audit";

async function buildRawBundle(userId: string): Promise<RawProfileBundle> {
  const db = getDb();
  const [userRow] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const sectionRecords = await getSectionRecords(userId);
  const scans = await db
    .select()
    .from(faceAtlasScans)
    .where(eq(faceAtlasScans.userId, userId))
    .orderBy(desc(faceAtlasScans.scanDate));
  const plans = await db.select().from(treatmentPlans).where(eq(treatmentPlans.userId, userId));
  const checkins = await db
    .select()
    .from(treatmentCheckins)
    .where(eq(treatmentCheckins.userId, userId))
    .orderBy(desc(treatmentCheckins.checkinDate));
  const triggers = await db
    .select()
    .from(triggerHypotheses)
    .where(eq(triggerHypotheses.userId, userId));
  const forecasts = await db
    .select()
    .from(forecastSummaries)
    .where(eq(forecastSummaries.userId, userId))
    .orderBy(desc(forecastSummaries.createdAt));
  const logs = await db.select().from(dailyLogs).where(eq(dailyLogs.userId, userId));

  const sectionsMap: RawProfileBundle["sections"] = {};
  for (const s of sectionRecords) {
    sectionsMap[s.sectionKey] = {
      value: s.value ?? {},
      version: s.version,
      updatedAt: s.updatedAt,
    };
  }

  const dates = logs.map((l) => l.logDate).sort();
  const daysOfHistory =
    dates.length > 0
      ? Math.max(
          1,
          Math.round(
            (new Date(dates[dates.length - 1]).getTime() - new Date(dates[0]).getTime()) /
              (1000 * 60 * 60 * 24),
          ) + 1,
        )
      : 0;

  return {
    userId,
    userName: userRow?.name ?? "AcneTrex Member",
    userEmail: userRow?.email ?? "",
    memberSince: userRow?.createdAt?.toISOString() ?? new Date().toISOString(),
    sections: sectionsMap,
    faceAtlasScans: scans.map((s) => ({
      scanDate: s.scanDate.toISOString(),
      userLesionCount: s.userLesionCount,
      modelLesionCount: s.modelLesionCount,
      agreementPct: s.agreementPct,
      confidence: s.confidence,
      hasRetainedImage: Boolean(s.imageStorageRef),
    })),
    treatmentPlans: plans.map((p) => ({
      name: p.name,
      activeIngredient: p.activeIngredient,
      status: p.status,
      startDate: p.startDate,
      reviewDate: p.reviewDate,
      instructions: p.instructions,
      providerDirected: p.providerDirected,
    })),
    treatmentCheckins: checkins.map((c) => ({
      checkinDate: c.checkinDate,
      status: c.status,
      irritation: c.irritation,
      notes: c.notes,
    })),
    triggerHypotheses: triggers.map((t) => ({
      triggerName: t.triggerName,
      status: t.status,
      evidenceCount: t.evidenceCount,
      notes: t.notes,
    })),
    forecastSummaries: forecasts.map((f) => ({
      window: f.window,
      status: f.status,
      summary: f.summary,
      confidence: f.confidence,
    })),
    dailyLogCount: logs.length,
    daysOfHistory,
  };
}

export async function createAndProcessReport(
  userId: string,
  inclusionOptions: ReportInclusionOptions,
  idempotencyKey?: string,
): Promise<{ reportRequestId: string; status: string }> {
  const db = getDb();
  const profile = await getProfessionalProfile(userId);

  if (idempotencyKey) {
    const [existing] = await db
      .select({ id: reportRequests.id, status: reportRequests.status })
      .from(reportRequests)
      .where(
        and(
          eq(reportRequests.userId, userId),
          eq(reportRequests.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    if (existing) return { reportRequestId: existing.id, status: existing.status };
  }

  const [request] = await db
    .insert(reportRequests)
    .values({
      userId,
      inclusionOptions,
      status: "processing",
      idempotencyKey: idempotencyKey ?? null,
    })
    .returning();

  const [job] = await db
    .insert(reportJobs)
    .values({ reportRequestId: request.id, status: "processing", startedAt: new Date() })
    .returning();

  // Consent snapshot at report time — required for auditability even if
  // consent later changes.
  await db.insert(reportConsentSnapshots).values({
    reportRequestId: request.id,
    consentJson: profile.consent,
  });

  try {
    // Enforce consent: photos can only be requested if the user's current
    // consent setting allows it (defense in depth beyond the client toggle).
    const effectiveInclusion: ReportInclusionOptions = {
      ...inclusionOptions,
      includeFaceAtlasPhotos:
        inclusionOptions.includeFaceAtlasPhotos && profile.consent.includeFaceAtlasPhotosInReports,
      includeTreatmentDetails:
        inclusionOptions.includeTreatmentDetails &&
        profile.consent.includeTreatmentDetailsInReports,
    };

    const bundle = await buildRawBundle(userId);
    const reportData = compileReportData(bundle, effectiveInclusion);
    const pdfBuffer = await renderReportPdf(reportData);

    const storageRef = buildReportStorageRef(userId, request.id);
    const { sizeBytes } = await putObject(storageRef, pdfBuffer);

    await db.insert(reportFiles).values({
      reportRequestId: request.id,
      storageRef,
      mimeType: "application/pdf",
      sizeBytes,
    });

    await db
      .update(reportRequests)
      .set({ status: "completed" })
      .where(eq(reportRequests.id, request.id));
    await db
      .update(reportJobs)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(reportJobs.id, job.id));

    await recordProfileAuditEvent(userId, "report_generated", { reportRequestId: request.id });

    return { reportRequestId: request.id, status: "completed" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown report generation error";
    await db
      .update(reportRequests)
      .set({ status: "failed" })
      .where(eq(reportRequests.id, request.id));
    await db
      .update(reportJobs)
      .set({ status: "failed", failureReason: message, completedAt: new Date() })
      .where(eq(reportJobs.id, job.id));
    return { reportRequestId: request.id, status: "failed" };
  }
}

export async function getReportMetadata(
  userId: string,
  reportRequestId: string,
): Promise<ReportMetadata | null> {
  const db = getDb();
  const [request] = await db
    .select()
    .from(reportRequests)
    .where(and(eq(reportRequests.id, reportRequestId), eq(reportRequests.userId, userId)))
    .limit(1);
  if (!request) return null;

  const [file] = await db
    .select()
    .from(reportFiles)
    .where(eq(reportFiles.reportRequestId, reportRequestId))
    .limit(1);

  const [job] = await db
    .select()
    .from(reportJobs)
    .where(eq(reportJobs.reportRequestId, reportRequestId))
    .orderBy(desc(reportJobs.createdAt))
    .limit(1);

  return {
    id: request.id,
    requestedAt: request.requestedAt.toISOString(),
    status: request.status as ReportMetadata["status"],
    inclusionOptions: request.inclusionOptions as ReportInclusionOptions,
    fileSizeBytes: file?.sizeBytes ?? null,
    failureReason: job?.failureReason ?? null,
  };
}

export async function listReportHistory(userId: string): Promise<ReportMetadata[]> {
  const db = getDb();
  const requests = await db
    .select()
    .from(reportRequests)
    .where(eq(reportRequests.userId, userId))
    .orderBy(desc(reportRequests.requestedAt));

  const results: ReportMetadata[] = [];
  for (const r of requests) {
    const [file] = await db
      .select()
      .from(reportFiles)
      .where(eq(reportFiles.reportRequestId, r.id))
      .limit(1);
    results.push({
      id: r.id,
      requestedAt: r.requestedAt.toISOString(),
      status: r.status as ReportMetadata["status"],
      inclusionOptions: r.inclusionOptions as ReportInclusionOptions,
      fileSizeBytes: file?.sizeBytes ?? null,
      failureReason: null,
    });
  }
  return results;
}

export async function getReportFileBuffer(
  userId: string,
  reportRequestId: string,
): Promise<Buffer | null> {
  const db = getDb();
  const [request] = await db
    .select()
    .from(reportRequests)
    .where(and(eq(reportRequests.id, reportRequestId), eq(reportRequests.userId, userId)))
    .limit(1);
  if (!request || request.status !== "completed") return null;

  const [file] = await db
    .select()
    .from(reportFiles)
    .where(eq(reportFiles.reportRequestId, reportRequestId))
    .limit(1);
  if (!file) return null;

  try {
    return await getObject(file.storageRef);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
}
