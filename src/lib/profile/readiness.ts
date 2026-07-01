import { eq } from "drizzle-orm";
import { db } from "@/db";
import { dailyLogs, faceAtlasScans } from "@/db/schema";
import { ModelReadinessSummary } from "@/types/profile";

/** Real, transparent thresholds — never a fabricated "AI readiness score". */
const PARTIAL_LOG_THRESHOLD = 7;
const AVAILABLE_LOG_THRESHOLD = 21;
const AVAILABLE_SCAN_THRESHOLD = 3;

export async function computeModelReadiness(userId: string): Promise<ModelReadinessSummary> {
  const logs = await db.select().from(dailyLogs).where(eq(dailyLogs.userId, userId));
  const scans = await db.select().from(faceAtlasScans).where(eq(faceAtlasScans.userId, userId));

  const totalLogs = logs.length;
  const totalScans = scans.length;

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

  const missingForNextLevel: string[] = [];
  let readinessLevel: ModelReadinessSummary["readinessLevel"] = "locked";

  if (totalLogs >= AVAILABLE_LOG_THRESHOLD && totalScans >= AVAILABLE_SCAN_THRESHOLD) {
    readinessLevel = "available";
  } else if (totalLogs >= PARTIAL_LOG_THRESHOLD) {
    readinessLevel = "partial";
    if (totalLogs < AVAILABLE_LOG_THRESHOLD) {
      missingForNextLevel.push(`${AVAILABLE_LOG_THRESHOLD - totalLogs} more daily logs`);
    }
    if (totalScans < AVAILABLE_SCAN_THRESHOLD) {
      missingForNextLevel.push(`${AVAILABLE_SCAN_THRESHOLD - totalScans} more FaceAtlas scans`);
    }
  } else {
    missingForNextLevel.push(`${PARTIAL_LOG_THRESHOLD - totalLogs} more daily logs`);
  }

  return { totalLogs, totalScans, daysOfHistory, readinessLevel, missingForNextLevel };
}
