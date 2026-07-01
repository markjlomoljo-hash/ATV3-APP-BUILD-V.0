import { eq } from "drizzle-orm";
import { db } from "@/db";
import { treatmentCheckins } from "@/db/schema";
import { requireSessionUser } from "@/lib/auth";
import { jsonOk, withApiHandler } from "@/lib/api-helpers";
import { checkinSchema } from "@/lib/validation";
import { addCheckin } from "@/lib/treatment/plans";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withApiHandler(async () => {
    await requireSessionUser();
    const { id } = await ctx.params;
    const rows = await db.select().from(treatmentCheckins).where(eq(treatmentCheckins.planId, id));
    return jsonOk({ checkins: rows });
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withApiHandler(async () => {
    const user = await requireSessionUser();
    const { id } = await ctx.params;
    const body = checkinSchema.parse(await req.json());
    const result = await addCheckin(user, id, body);
    return jsonOk(result, 201);
  });
}
