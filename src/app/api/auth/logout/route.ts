import { cookies } from "next/headers";
import { destroySession, SESSION_COOKIE } from "@/lib/auth";
import { jsonOk, withApiHandler } from "@/lib/api-helpers";

export async function POST() {
  return withApiHandler(async () => {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (token) await destroySession(token);
    const response = jsonOk({});
    response.cookies.set(SESSION_COOKIE, "", { path: "/", expires: new Date(0) });
    return response;
  });
}
