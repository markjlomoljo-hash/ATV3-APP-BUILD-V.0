import { db } from "@/db";
import { badges, ranks, taskTemplates } from "@/db/schema";
import { BADGES, RANKS, TASK_TEMPLATES } from "./seed-data";

let seeded = false;

/** Idempotently upserts catalog rows (task templates, badges, ranks). This
 * is configuration data, not user data, so it is safe and expected to be
 * deterministic on every boot. */
export async function ensureCatalogSeeded() {
  if (seeded) return;

  await Promise.all([
    ...TASK_TEMPLATES.map((t) =>
      db
        .insert(taskTemplates)
        .values({
          id: t.id,
          category: t.category,
          title: t.title,
          description: t.description,
          reasonTemplate: t.reasonTemplate,
          basePoints: t.basePoints,
          difficulty: t.difficulty,
          requiredForStreak: t.requiredForStreak,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: taskTemplates.id,
          set: {
            category: t.category,
            title: t.title,
            description: t.description,
            reasonTemplate: t.reasonTemplate,
            basePoints: t.basePoints,
            difficulty: t.difficulty,
            requiredForStreak: t.requiredForStreak,
            isActive: true,
          },
        }),
    ),
    ...BADGES.map((b) =>
      db
        .insert(badges)
        .values(b)
        .onConflictDoUpdate({ target: badges.id, set: { name: b.name, description: b.description, category: b.category, icon: b.icon } }),
    ),
    ...RANKS.map((r) =>
      db
        .insert(ranks)
        .values(r)
        .onConflictDoUpdate({ target: ranks.id, set: { name: r.name, minPoints: r.minPoints, minStreak: r.minStreak, sortOrder: r.sortOrder } }),
    ),
  ]);

  seeded = true;
}
