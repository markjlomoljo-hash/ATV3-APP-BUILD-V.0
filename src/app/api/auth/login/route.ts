import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, SESSION_COOKIE, verifyPassword } from "@/lib/auth";
import { jsonError, jsonOk, withApiHandler } from "@/lib/api-helpers";
import { loginSchema } from "@/lib/validation";

export async function POST(req: Request) {
  return withApiHandler(async () => {
    const body = loginSchema.parse(await req.json());
    const [user] = await db.select().from(users).where(eq(users.email, body.email.toLowerCase())).limit(1);
    if (!user) return jsonError(401, "Invalid email or password.");

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) return jsonError(401, "Invalid email or password.");

    const { token, expiresAt } = await createSession(user.id);
    const response = jsonOk({
      user: { id: user.id, email: user.email, displayName: user.displayName, timezone: user.timezone, mealFrequencyBaseline: user.mealFrequencyBaseline },
    });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: expiresAt,
    });
    return response;
  });
}
