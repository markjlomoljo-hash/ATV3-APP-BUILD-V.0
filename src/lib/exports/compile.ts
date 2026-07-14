import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  consentSettings,
  dailyLogs,
  faceAtlasScans,
  profileSections,
  profileVersionHistory,
  reportRequests,
  treatmentTasks,
  treatmentCheckins,
  treatmentPlans,
  weatherSnapshots,
} from "@/db/schema";
import { ExportScope } from "@/types/profile";

export type ExportBundle = Record<string, Array<Record<string, unknown>>>;

async function collectAll(userId: string): Promise<ExportBundle> {
  const db = getDb();
  const [profile, history, logs, scans, plans, checkins, weather, reports, consent, taskRows] =
    await Promise.all([
      db.select().from(profileSections).where(eq(profileSections.userId, userId)),
      db.select().from(profileVersionHistory).where(eq(profileVersionHistory.userId, userId)),
      db.select().from(dailyLogs).where(eq(dailyLogs.userId, userId)),
      db.select().from(faceAtlasScans).where(eq(faceAtlasScans.userId, userId)),
      db.select().from(treatmentPlans).where(eq(treatmentPlans.userId, userId)),
      db.select().from(treatmentCheckins).where(eq(treatmentCheckins.userId, userId)),
      db.select().from(weatherSnapshots).where(eq(weatherSnapshots.userId, userId)),
      db.select().from(reportRequests).where(eq(reportRequests.userId, userId)),
      db.select().from(consentSettings).where(eq(consentSettings.userId, userId)),
      db.select().from(treatmentTasks).where(eq(treatmentTasks.userId, userId)),
    ]);

  return {
    profile_sections: profile as unknown as Array<Record<string, unknown>>,
    profile_version_history: history as unknown as Array<Record<string, unknown>>,
    daily_logs: logs as unknown as Array<Record<string, unknown>>,
    face_atlas_scans: scans as unknown as Array<Record<string, unknown>>,
    treatment_plans: plans as unknown as Array<Record<string, unknown>>,
    treatment_checkins: checkins as unknown as Array<Record<string, unknown>>,
    weather_snapshots: weather as unknown as Array<Record<string, unknown>>,
    reports: reports as unknown as Array<Record<string, unknown>>,
    consents: consent as unknown as Array<Record<string, unknown>>,
    tasks: taskRows as unknown as Array<Record<string, unknown>>,
  };
}

export async function gatherExportBundle(userId: string, scope: ExportScope): Promise<ExportBundle> {
  const all = await collectAll(userId);
  if (scope === "all") return all;

  const scopeToKeys: Record<Exclude<ExportScope, "all">, string[]> = {
    profile: ["profile_sections", "profile_version_history"],
    logs: ["daily_logs"],
    scans: ["face_atlas_scans"],
    treatment_plans: ["treatment_plans", "treatment_checkins"],
    tasks: ["tasks"],
    weather: ["weather_snapshots"],
    reports: ["reports"],
    consents: ["consents"],
  };

  const keys = scopeToKeys[scope as Exclude<ExportScope, "all">] ?? [];
  const filtered: ExportBundle = {};
  for (const key of keys) {
    filtered[key] = all[key] ?? [];
  }
  return filtered;
}
