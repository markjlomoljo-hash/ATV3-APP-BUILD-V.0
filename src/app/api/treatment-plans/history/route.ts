import { requireSessionUser } from "@/lib/auth";
import { jsonOk, withApiHandler } from "@/lib/api-helpers";
import { getPlanHistory } from "@/lib/treatment/plans";

export async function GET() {
  return withApiHandler(async () => {
    const user = await requireSessionUser();
    const plans = await getPlanHistory(user.id);
    return jsonOk({ plans });
  });
}
