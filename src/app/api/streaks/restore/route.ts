import { requireSessionUser } from "@/lib/auth";
import { jsonOk, withApiHandler } from "@/lib/api-helpers";
import { restoreStreakSchema } from "@/lib/validation";
import { restoreStreakDay } from "@/lib/gamification/streak-restore";

export async function POST(req: Request) {
  return withApiHandler(async () => {
    const user = await requireSessionUser();
    const body = restoreStreakSchema.parse(await req.json());
    const result = await restoreStreakDay(user, body.targetDate);
    return jsonOk(result);
  });
}
