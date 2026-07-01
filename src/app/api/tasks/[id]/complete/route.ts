import { requireSessionUser } from "@/lib/auth";
import { jsonOk, withApiHandler } from "@/lib/api-helpers";
import { completeTaskSchema } from "@/lib/validation";
import { completeTask } from "@/lib/gamification/complete-task";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withApiHandler(async () => {
    const user = await requireSessionUser();
    const { id } = await ctx.params;
    const body = completeTaskSchema.parse(await req.json());
    const result = await completeTask(user, id, body);
    return jsonOk(result);
  });
}
