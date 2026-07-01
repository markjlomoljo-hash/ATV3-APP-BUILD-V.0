import { randomUUID } from "crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { consentReviews } from "@/db/schema";
import { requireSessionUser } from "@/lib/auth";
import { jsonOk, withApiHandler } from "@/lib/api-helpers";

export async function POST(req: Request) {
  return withApiHandler(async () => {
    const user = await requireSessionUser();
    const body = (await req.json().catch(() => ({}))) as { version?: string };
    const [row] = await db
      .insert(consentReviews)
      .values({ id: randomUUID(), userId: user.id, version: body.version ?? "v1" })
      .returning();
    return jsonOk({ review: row });
  });
}

export async function GET() {
  return withApiHandler(async () => {
    const user = await requireSessionUser();
    const rows = await db.select().from(consentReviews).where(eq(consentReviews.userId, user.id)).orderBy(desc(consentReviews.reviewedAt));
    return jsonOk({ reviews: rows });
  });
}
