import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { onboardingProgress, profiles } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { parseJsonBody, withErrorHandling } from "@/lib/http";
import { onboardingProgressSchema } from "@/lib/validation/profile";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const [row] = await db
      .select()
      .from(onboardingProgress)
      .where(eq(onboardingProgress.userId, auth.ctx.user.id))
      .limit(1);

    return NextResponse.json({ onboarding: row ?? null });
  });
}

export async function PUT(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;

    const parsed = await parseJsonBody(req, onboardingProgressSchema);
    if ("error" in parsed) return parsed.error;
    const { currentStep, completedSteps, isComplete } = parsed.data;

    const now = new Date();
    const [row] = await db
      .insert(onboardingProgress)
      .values({
        userId,
        currentStep,
        completedSteps: completedSteps ?? [],
        isComplete: isComplete ?? false,
        completedAt: isComplete ? now : undefined,
      })
      .onConflictDoUpdate({
        target: onboardingProgress.userId,
        set: {
          currentStep,
          completedSteps: completedSteps ?? [],
          isComplete: isComplete ?? false,
          completedAt: isComplete ? now : undefined,
          updatedAt: now,
        },
      })
      .returning();

    if (isComplete) {
      await db
        .update(profiles)
        .set({ onboardingCompletedAt: now })
        .where(eq(profiles.userId, userId));
      await writeAuditLog({ userId, action: "onboarding.completed", resourceType: "onboarding", resourceId: userId });
    }

    return NextResponse.json({ onboarding: row });
  });
}
