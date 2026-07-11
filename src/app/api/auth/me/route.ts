import { getSessionUser } from "@/lib/auth";
import { jsonOk, withApiHandler } from "@/lib/api-helpers";

export async function GET() {
  return withApiHandler(async () => {
    const user = await getSessionUser();
    return jsonOk({ user });
  });
}
