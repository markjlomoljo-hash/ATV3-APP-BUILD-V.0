import { requireSessionUser } from "@/lib/auth";
import { jsonOk, withApiHandler } from "@/lib/api-helpers";
import { uncompleteTaskIfAllowed } from "@/lib/gamification/complete-task";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withApiHandler(async () => {
    const user = await requireSessionUser();
    const { id } = await ctx.params;
    const result = await uncompleteTaskIfAllowed(user, id);
    return jsonOk(result);
  });
}
