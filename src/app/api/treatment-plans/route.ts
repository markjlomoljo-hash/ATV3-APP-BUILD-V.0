import { requireSessionUser } from "@/lib/auth";
import { jsonOk, withApiHandler } from "@/lib/api-helpers";
import { createPlanSchema } from "@/lib/validation";
import { createPlan, listPlans } from "@/lib/treatment/plans";

export async function GET(req: Request) {
  return withApiHandler(async () => {
    const user = await requireSessionUser();
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? undefined;
    const plans = await listPlans(user.id, status);
    return jsonOk({ plans });
  });
}

export async function POST(req: Request) {
  return withApiHandler(async () => {
    const user = await requireSessionUser();
    const body = createPlanSchema.parse(await req.json());
    const plan = await createPlan(user, body);
    return jsonOk({ plan }, 201);
  });
}
