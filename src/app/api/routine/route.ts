import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { routines, routineSteps } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { parseJsonBody, withErrorHandling } from "@/lib/http";
import { createRoutineSchema } from "@/lib/validation/products";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const rows = await db.select().from(routines).where(eq(routines.userId, auth.ctx.user.id));
    const stepsByRoutine = await Promise.all(
      rows.map(async (routine) => ({
        routine,
        steps: await db.select().from(routineSteps).where(eq(routineSteps.routineId, routine.id)),
      })),
    );

    return NextResponse.json({ routines: stepsByRoutine });
  });
}

export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;

    const parsed = await parseJsonBody(req, createRoutineSchema);
    if ("error" in parsed) return parsed.error;
    const { steps, ...routineFields } = parsed.data;

    const [routine] = await db.insert(routines).values({ userId, ...routineFields }).returning();

    let insertedSteps: (typeof routineSteps.$inferSelect)[] = [];
    if (steps && steps.length > 0) {
      insertedSteps = await db
        .insert(routineSteps)
        .values(
          steps.map((step) => ({
            routineId: routine.id,
            productId: step.productId,
            stepOrder: String(step.stepOrder),
            instructions: step.instructions,
          })),
        )
        .returning();
    }

    await writeAuditLog({ userId, action: "routine.created", resourceType: "routine", resourceId: routine.id });

    return NextResponse.json({ routine, steps: insertedSteps }, { status: 201 });
  });
}
