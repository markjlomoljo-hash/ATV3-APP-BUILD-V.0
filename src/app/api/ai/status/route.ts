import { NextRequest, NextResponse } from "next/server";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { modelRegistry, inferenceJobs } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { withErrorHandling } from "@/lib/http";

export const dynamic = "force-dynamic";

/** Reports real model registry state and the caller's own inference job history. */
export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const models = await db.select().from(modelRegistry);
    const jobs = await db
      .select()
      .from(inferenceJobs)
      .where(eq(inferenceJobs.userId, auth.ctx.user.id))
      .limit(50);

    const [{ value: totalJobs }] = await db
      .select({ value: count() })
      .from(inferenceJobs)
      .where(eq(inferenceJobs.userId, auth.ctx.user.id));

    return NextResponse.json({
      models,
      recentJobs: jobs,
      totalJobsForUser: Number(totalJobs),
    });
  });
}
