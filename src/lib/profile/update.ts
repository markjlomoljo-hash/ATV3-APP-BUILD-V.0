import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { profileAuditEvents, profileSections, profileVersionHistory } from "@/db/schema";
import { ProfileSectionKey, ProfileSectionRecord, ProfileVersionEntry } from "@/types/profile";
import { isVersionedSection, SECTION_METADATA } from "./sections";

function isSerializationFailure(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "40001";
}

export async function updateProfileSection(
  userId: string,
  sectionKey: ProfileSectionKey,
  newValue: Record<string, unknown>,
  options: { reason?: string; includeInReports?: boolean } = {},
): Promise<ProfileSectionRecord> {
  const db = getDb();
  const versioned = isVersionedSection(sectionKey);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.transaction(
        async (tx) => {
          const [existing] = await tx
            .select()
            .from(profileSections)
            .where(and(eq(profileSections.userId, userId), eq(profileSections.sectionKey, sectionKey)))
            .limit(1)
            .for("update");

          const previousValue =
            (existing?.valueJson as Record<string, unknown> | undefined) ?? null;
          const nextVersion = (existing?.version ?? 0) + 1;
          const updatedAt = new Date();

          if (existing) {
            await tx
              .update(profileSections)
              .set({
                valueJson: newValue,
                version: nextVersion,
                updatedAt,
                updatedBy: "user",
              })
              .where(eq(profileSections.id, existing.id));
          } else {
            await tx.insert(profileSections).values({
              userId,
              sectionKey,
              valueJson: newValue,
              version: nextVersion,
              updatedAt,
              updatedBy: "user",
            });
          }

          if (versioned) {
            await tx.insert(profileVersionHistory).values({
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

          await tx.insert(profileAuditEvents).values({
            userId,
            eventType: "profile_section_updated",
            metadataJson: { sectionKey, version: nextVersion, versioned },
          });

          return {
            sectionKey,
            value: newValue,
            version: nextVersion,
            updatedAt: updatedAt.toISOString(),
            updatedBy: "user",
            isVersioned: versioned,
          };
        },
        { isolationLevel: "serializable", accessMode: "read write" },
      );
    } catch (error) {
      if (attempt < 2 && isSerializationFailure(error)) continue;
      throw error;
    }
  }

  throw new Error("Profile update retry budget exhausted");
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
