import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { profileSections, profileVersionHistory } from "@/db/schema";
import { ProfileSectionKey, ProfileSectionRecord, ProfileVersionEntry } from "@/types/profile";
import { isVersionedSection, SECTION_METADATA } from "./sections";
import { recordProfileAuditEvent } from "@/lib/audit";

export async function updateProfileSection(
  userId: string,
  sectionKey: ProfileSectionKey,
  newValue: Record<string, unknown>,
  options: { reason?: string; includeInReports?: boolean } = {},
): Promise<ProfileSectionRecord> {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(profileSections)
    .where(and(eq(profileSections.userId, userId), eq(profileSections.sectionKey, sectionKey)))
    .limit(1);

  const previousValue = (existing?.valueJson as Record<string, unknown> | undefined) ?? null;
  const nextVersion = (existing?.version ?? 0) + 1;

  if (existing) {
    await db
      .update(profileSections)
      .set({ valueJson: newValue, version: nextVersion, updatedAt: new Date(), updatedBy: "user" })
      .where(eq(profileSections.id, existing.id));
  } else {
    await db.insert(profileSections).values({
      userId,
      sectionKey,
      valueJson: newValue,
      version: nextVersion,
      updatedBy: "user",
    });
  }

  const versioned = isVersionedSection(sectionKey);
  if (versioned) {
    await db.insert(profileVersionHistory).values({
      userId,
      sectionKey,
      version: nextVersion,
      previousValueJson: previousValue,
      newValueJson: newValue,
      actor: "user",
      reason: options.reason ?? null,
      includeInReports: options.includeInReports ?? true,
    });
  }

  await recordProfileAuditEvent(userId, "profile_section_updated", {
    sectionKey,
    version: nextVersion,
    versioned,
  });

  return {
    sectionKey,
    value: newValue,
    version: nextVersion,
    updatedAt: new Date().toISOString(),
    updatedBy: "user",
    isVersioned: versioned,
  };
}

export async function getSectionHistory(
  userId: string,
  sectionKey: ProfileSectionKey,
): Promise<ProfileVersionEntry[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(profileVersionHistory)
    .where(
      and(
        eq(profileVersionHistory.userId, userId),
        eq(profileVersionHistory.sectionKey, sectionKey),
      ),
    )
    .orderBy(profileVersionHistory.version);

  return rows.map((r) => ({
    id: r.id,
    sectionKey: r.sectionKey,
    version: r.version,
    previousValue: (r.previousValueJson as Record<string, unknown> | null) ?? null,
    newValue: r.newValueJson as Record<string, unknown>,
    changedAt: r.changedAt.toISOString(),
    actor: r.actor,
    reason: r.reason,
    includeInReports: r.includeInReports,
  }));
}

export function sectionMetadataFor(key: ProfileSectionKey) {
  return SECTION_METADATA[key];
}
