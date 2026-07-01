// Full-account data export. Pulls every user-owned domain table so the
// export is a genuine, complete snapshot — never a partial or fabricated one.
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  users,
  profiles,
  consents,
  sleepLogs,
  foodLogs,
  mealEvents,
  stressLogs,
  activityLogs,
  hydrationLogs,
  cycleLogs,
  contactLogs,
  products,
  productUsageLogs,
  routines,
  treatmentPlans,
  scanSessions,
  faceImages,
  lesionAnnotations,
  pointsLedger,
  streaks,
} from "@/db/schema";

export async function buildFullAccountExport(userId: string) {
  const [
    user,
    profile,
    consentRecords,
    sleep,
    food,
    meals,
    stress,
    activity,
    hydration,
    cycle,
    contact,
    userProducts,
    usage,
    userRoutines,
    plans,
    scans,
    images,
    annotations,
    points,
    streak,
  ] = await Promise.all([
    db.select({ id: users.id, email: users.email, displayName: users.displayName, createdAt: users.createdAt }).from(users).where(eq(users.id, userId)),
    db.select().from(profiles).where(eq(profiles.userId, userId)),
    db.select().from(consents).where(eq(consents.userId, userId)),
    db.select().from(sleepLogs).where(eq(sleepLogs.userId, userId)),
    db.select().from(foodLogs).where(eq(foodLogs.userId, userId)),
    db.select().from(mealEvents).where(eq(mealEvents.userId, userId)),
    db.select().from(stressLogs).where(eq(stressLogs.userId, userId)),
    db.select().from(activityLogs).where(eq(activityLogs.userId, userId)),
    db.select().from(hydrationLogs).where(eq(hydrationLogs.userId, userId)),
    db.select().from(cycleLogs).where(eq(cycleLogs.userId, userId)),
    db.select().from(contactLogs).where(eq(contactLogs.userId, userId)),
    db.select().from(products).where(eq(products.userId, userId)),
    db.select().from(productUsageLogs).where(eq(productUsageLogs.userId, userId)),
    db.select().from(routines).where(eq(routines.userId, userId)),
    db.select().from(treatmentPlans).where(eq(treatmentPlans.userId, userId)),
    db.select().from(scanSessions).where(eq(scanSessions.userId, userId)),
    db
      .select({
        id: faceImages.id,
        angle: faceImages.angle,
        qualityStatus: faceImages.qualityStatus,
        isDeleted: faceImages.isDeleted,
        createdAt: faceImages.createdAt,
      })
      .from(faceImages)
      .where(eq(faceImages.userId, userId)),
    db.select().from(lesionAnnotations).where(eq(lesionAnnotations.userId, userId)),
    db.select().from(pointsLedger).where(eq(pointsLedger.userId, userId)),
    db.select().from(streaks).where(eq(streaks.userId, userId)),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    account: user[0] ?? null,
    profile: profile[0] ?? null,
    consents: consentRecords,
    logs: { sleep, food, meals, stress, activity, hydration, cycle, contact },
    products: { items: userProducts, usage },
    routines: userRoutines,
    treatmentPlans: plans,
    faceAtlas: { scans, images, annotations },
    gamification: { pointsLedger: points, streak: streak[0] ?? null },
    note: "Raw face image bytes are not included in this export; only metadata is. Request image files individually via the FaceAtlas API while your account remains active.",
  };
}
