import { requireSessionUser } from "@/lib/auth";
import { jsonOk, withApiHandler } from "@/lib/api-helpers";
import { addDaysToLocalDate, localDateInTimezone } from "@/lib/dates";
import { getTaskHistory } from "@/lib/gamification/task-generation";

export async function GET(req: Request) {
  return withApiHandler(async () => {
    const user = await requireSessionUser();
    const url = new URL(req.url);
    const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days") ?? 30)));
    const today = localDateInTimezone(user.timezone);
    const since = addDaysToLocalDate(today, -days);
    const history = await getTaskHistory(user.id, since);
    return jsonOk({ history });
  });
}
