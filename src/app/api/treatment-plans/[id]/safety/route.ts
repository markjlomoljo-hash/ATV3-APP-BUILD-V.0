import { requireSessionUser } from "@/lib/auth";
import { jsonOk, withApiHandler } from "@/lib/api-helpers";
import { getSafetyForPlan } from "@/lib/treatment/plans";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withApiHandler(async () => {
    const user = await requireSessionUser();
    const { id } = await ctx.params;
    const flags = await getSafetyForPlan(user.id, id);
    return jsonOk({ flags });
  });
}
