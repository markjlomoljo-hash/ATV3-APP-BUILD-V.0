import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, hashPassword, SESSION_COOKIE } from "@/lib/auth";
import { jsonError, jsonOk, withApiHandler } from "@/lib/api-helpers";
import { registerSchema } from "@/lib/validation";

export async function POST(req: Request) {
  return withApiHandler(async () => {
    const body = registerSchema.parse(await req.json());

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email.toLowerCase())).limit(1);
    if (existing.length > 0) {
      return jsonError(409, "An account with that email already exists.");
    }

    const passwordHash = await hashPassword(body.password);
    const [user] = await db
      .insert(users)
      .values({
        id: randomUUID(),
        email: body.email.toLowerCase(),
        passwordHash,
        displayName: body.displayName,
        timezone: body.timezone,
        mealFrequencyBaseline: body.mealFrequencyBaseline,
      })
      .returning();

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
