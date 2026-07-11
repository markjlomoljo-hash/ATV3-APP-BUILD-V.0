import { requireSessionUser } from "@/lib/auth";
import { jsonOk, withApiHandler } from "@/lib/api-helpers";
import { statusChangeSchema } from "@/lib/validation";
import { changePlanStatus } from "@/lib/treatment/plans";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withApiHandler(async () => {
    const user = await requireSessionUser();
    const { id } = await ctx.params;
    const body = statusChangeSchema.parse(await req.json().catch(() => ({})));
    const plan = await changePlanStatus(user, id, "resume", body.reason);
    return jsonOk({ plan });
  });
}
