import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { skinTwinSimulations } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { parseJsonBody, withErrorHandling } from "@/lib/http";
import { evaluateReadiness } from "@/lib/services/aiReadiness";
import { enqueueJob } from "@/lib/jobs";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;

    const rows = await db
      .select()
      .from(skinTwinSimulations)
      .where(eq(skinTwinSimulations.userId, auth.ctx.user.id))
      .orderBy(desc(skinTwinSimulations.createdAt))
      .limit(30);

    return NextResponse.json({ simulations: rows });
  });
}

const simulateSchema = z.object({
  scenarioInput: z.record(z.string(), z.unknown()),
});

/**
 * Requests a Skin Twin "what-if" simulation. No fabricated simulation output
 * is ever returned inline — the record starts as queued/insufficient_data
 * and a background job is enqueued for a real simulation engine to fulfil
 * once one is configured.
 */
export async function POST(req: NextRequest) {
  return withErrorHandling(async () => {
    const auth = await requireAuth(req);
    if ("error" in auth) return auth.error;
    const userId = auth.ctx.user.id;

    const parsed = await parseJsonBody(req, simulateSchema);
    if ("error" in parsed) return parsed.error;

    const readiness = await evaluateReadiness(userId);
    const domain = readiness.find((d) => d.domain === "skin_twin");
    const status = domain?.modelStatus === "not_configured" ? "insufficient_data" : "queued";

    const [simulation] = await db
      .insert(skinTwinSimulations)
      .values({
        userId,
        scenarioInput: parsed.data.scenarioInput,
        status,
        confidenceLabel: "insufficient_data",
        resultPayload: null,
      })
      .returning();

    if (status === "queued") {
      await enqueueJob("skin_twin_simulate", { simulationId: simulation.id }, { userId });
    }

    await writeAuditLog({ userId, action: "skin_twin.simulation_requested", resourceType: "skin_twin_simulation", resourceId: simulation.id });

    return NextResponse.json({ simulation }, { status: 202 });
  });
}
