import { requireSessionUser } from "@/lib/auth";
import { jsonOk, withApiHandler } from "@/lib/api-helpers";
import { updatePlanSchema } from "@/lib/validation";
import { getPlanOrThrow, updatePlan } from "@/lib/treatment/plans";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withApiHandler(async () => {
    const user = await requireSessionUser();
    const { id } = await ctx.params;
    const plan = await getPlanOrThrow(user.id, id);
    return jsonOk({ plan });
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withApiHandler(async () => {
    const user = await requireSessionUser();
    const { id } = await ctx.params;
    const body = updatePlanSchema.parse(await req.json());
    const plan = await updatePlan(user, id, body);
    return jsonOk({ plan });
  });
}
