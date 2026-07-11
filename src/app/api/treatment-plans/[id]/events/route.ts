import { eq } from "drizzle-orm";
import { db } from "@/db";
import { treatmentEvents } from "@/db/schema";
import { requireSessionUser } from "@/lib/auth";
import { jsonOk, withApiHandler } from "@/lib/api-helpers";
import { treatmentEventSchema } from "@/lib/validation";
import { addEvent } from "@/lib/treatment/plans";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withApiHandler(async () => {
    await requireSessionUser();
    const { id } = await ctx.params;
    const rows = await db.select().from(treatmentEvents).where(eq(treatmentEvents.planId, id));
    return jsonOk({ events: rows });
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withApiHandler(async () => {
    const user = await requireSessionUser();
    const { id } = await ctx.params;
    const body = treatmentEventSchema.parse(await req.json());
    const result = await addEvent(user, id, body);
    return jsonOk(result, 201);
  });
}
