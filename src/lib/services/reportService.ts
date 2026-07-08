// Dermatologist-ready report data assembly. Every section is populated only
// from real stored rows; any section without enough data is explicitly
// marked insufficient_data rather than omitted silently or fabricated.
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { sleepLogs, foodLogs, stressLogs, activityLogs, scanSessions, treatmentPlans, products } from "@/db/schema";

export interface ReportSection {
  key: string;
  status: "included" | "insufficient_data";
  data: unknown;
}

export async function assembleReportSections(
  userId: string,
  windowStart: Date,
  windowEnd: Date,
): Promise<ReportSection[]> {
  const startDate = windowStart.toISOString().slice(0, 10);
  const endDate = windowEnd.toISOString().slice(0, 10);

  const [sleep, food, stress, activity, scans, plans, activeProducts] = await Promise.all([
    db.select().from(sleepLogs).where(and(eq(sleepLogs.userId, userId), gte(sleepLogs.logDate, startDate), lte(sleepLogs.logDate, endDate))),
    db.select().from(foodLogs).where(and(eq(foodLogs.userId, userId), gte(foodLogs.logDate, startDate), lte(foodLogs.logDate, endDate))),
    db.select().from(stressLogs).where(and(eq(stressLogs.userId, userId), gte(stressLogs.logDate, startDate), lte(stressLogs.logDate, endDate))),
    db.select().from(activityLogs).where(and(eq(activityLogs.userId, userId), gte(activityLogs.logDate, startDate), lte(activityLogs.logDate, endDate))),
    db.select().from(scanSessions).where(eq(scanSessions.userId, userId)).orderBy(desc(scanSessions.capturedAt)).limit(10),
    db.select().from(treatmentPlans).where(eq(treatmentPlans.userId, userId)),
    db.select().from(products).where(and(eq(products.userId, userId), eq(products.isActive, true))),
  ]);

  const sections: ReportSection[] = [
    { key: "sleep", status: sleep.length > 0 ? "included" : "insufficient_data", data: sleep.length > 0 ? sleep : null },
    { key: "diet", status: food.length > 0 ? "included" : "insufficient_data", data: food.length > 0 ? food : null },
    { key: "stress", status: stress.length > 0 ? "included" : "insufficient_data", data: stress.length > 0 ? stress : null },
    { key: "activity", status: activity.length > 0 ? "included" : "insufficient_data", data: activity.length > 0 ? activity : null },
    { key: "face_atlas_scans", status: scans.length > 0 ? "included" : "insufficient_data", data: scans.length > 0 ? scans : null },
    { key: "treatment_plans", status: plans.length > 0 ? "included" : "insufficient_data", data: plans.length > 0 ? plans : null },
    { key: "active_products", status: activeProducts.length > 0 ? "included" : "insufficient_data", data: activeProducts.length > 0 ? activeProducts : null },
  ];

  return sections;
}
