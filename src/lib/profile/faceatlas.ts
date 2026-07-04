import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { faceAtlasScans } from "@/db/schema";
import { FaceAtlasHistorySummary } from "@/types/profile";

export async function computeFaceAtlasSummary(userId: string): Promise<FaceAtlasHistorySummary> {
  const db = getDb();
  const scans = await db
    .select()
    .from(faceAtlasScans)
    .where(eq(faceAtlasScans.userId, userId))
    .orderBy(desc(faceAtlasScans.scanDate));

  if (scans.length === 0) {
    return {
      totalScans: 0,
      lastScanDate: null,
      averageAgreementPct: null,
      confidenceTrend: "insufficient_data",
      scans: [],
      insufficientData: true,
    };
  }

  const agreementValues = scans
    .map((s) => s.agreementPct)
    .filter((v): v is number => v !== null && v !== undefined);
  const averageAgreementPct =
    agreementValues.length > 0
      ? Math.round((agreementValues.reduce((a, b) => a + b, 0) / agreementValues.length) * 10) / 10
      : null;

  const confidenceTrend = scans.length >= 5 ? "moderate_confidence" : "early_hypothesis";

  return {
    totalScans: scans.length,
    lastScanDate: scans[0].scanDate.toISOString(),
    averageAgreementPct,
    confidenceTrend,
    scans: scans.map((s) => ({
      id: s.id,
      scanDate: s.scanDate.toISOString(),
      userLesionCount: s.userLesionCount ?? null,
      modelLesionCount: s.modelLesionCount ?? null,
      agreementPct: s.agreementPct ?? null,
      confidence: s.confidence,
      hasRetainedImage: Boolean(s.imageStorageRef),
    })),
    insufficientData: false,
  };
}
