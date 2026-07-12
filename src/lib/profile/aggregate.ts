import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { consentSettings, profileSections, users } from "@/db/schema";
import { ProfessionalProfile, ProfileSectionRecord } from "@/types/profile";
import { allSectionKeys, isVersionedSection, SECTION_METADATA } from "./sections";
import { computeFaceAtlasSummary } from "./faceatlas";
import { computeModelReadiness } from "./readiness";
import { computeGamificationSummary } from "./gamification";
import { computeTreatmentSummary } from "./treatment";

export async function getSectionRecords(userId: string): Promise<ProfileSectionRecord[]> {
  const db = getDb();
  const rows = await db.select().from(profileSections).where(eq(profileSections.userId, userId));
  const byKey = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const current = byKey.get(row.sectionKey);
    if (!current || row.version > current.version) byKey.set(row.sectionKey, row);
  }

  return allSectionKeys().map((key) => {
    const row = byKey.get(key);
    if (!row) {
      return {
        sectionKey: key,
        value: structuredClone(SECTION_METADATA[key].emptyValue),
        version: 0,
        updatedAt: null,
        updatedBy: null,
        isVersioned: isVersionedSection(key),
      };
    }
    return {
      sectionKey: key,
      value: row.valueJson as Record<string, unknown>,
      version: row.version,
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: row.updatedBy,
      isVersioned: isVersionedSection(key),
    };
  });
}

export async function getProfessionalProfile(userId: string): Promise<ProfessionalProfile> {
  const db = getDb();
  const [userRow] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const [consentRow] = await db
    .select()
    .from(consentSettings)
    .where(eq(consentSettings.userId, userId))
    .limit(1);

  const [sections, faceAtlasSummary, modelReadiness, gamification, treatmentSummary] =
    await Promise.all([
      getSectionRecords(userId),
      computeFaceAtlasSummary(userId),
      computeModelReadiness(userId),
      computeGamificationSummary(userId),
      computeTreatmentSummary(userId),
    ]);

  return {
    userId,
    identity: {
      email: userRow.email,
      name: userRow.name,
      memberSince: userRow.createdAt.toISOString(),
    },
    sections,
    consent: {
      anonymousLearning: consentRow?.anonymousLearning ?? false,
      rawImageLearning: consentRow?.rawImageLearning ?? false,
      includeFaceAtlasPhotosInReports: consentRow?.includeFaceAtlasPhotosInReports ?? false,
      includeTreatmentDetailsInReports: consentRow?.includeTreatmentDetailsInReports ?? true,
      marketingNotifications: consentRow?.marketingNotifications ?? false,
      productAnalysisNotifications: consentRow?.productAnalysisNotifications ?? true,
      reportReadyNotifications: consentRow?.reportReadyNotifications ?? true,
      streakRiskNotifications: consentRow?.streakRiskNotifications ?? true,
      weatherAlertNotifications: consentRow?.weatherAlertNotifications ?? true,
      updatedAt: consentRow?.updatedAt?.toISOString() ?? null,
    },
    faceAtlasSummary,
    modelReadiness,
    gamification,
    treatmentSummary,
  };
}
