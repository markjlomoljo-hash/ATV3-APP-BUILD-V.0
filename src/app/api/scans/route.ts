import { randomUUID } from "crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { faceScans } from "@/db/schema";
import { requireSessionUser } from "@/lib/auth";
import { jsonOk, withApiHandler } from "@/lib/api-helpers";
import { scanSchema } from "@/lib/validation";

// Minimal FaceAtlas integration stand-in. Full multi-angle capture, lesion
// annotation UI, and model inference belong to the FaceAtlas phase; this
// route only records the honest facts Task Board and progress scoring need:
// a scan happened on a date, which angles were captured, and whether the
// mandatory annotation step was completed.
export async function POST(req: Request) {
  return withApiHandler(async () => {
    const user = await requireSessionUser();
    const body = scanSchema.parse(await req.json());
    const [row] = await db
      .insert(faceScans)
      .values({ id: randomUUID(), userId: user.id, ...body })
      .returning();
    return jsonOk({ scan: row });
  });
}

export async function GET() {
  return withApiHandler(async () => {
    const user = await requireSessionUser();
    const rows = await db.select().from(faceScans).where(eq(faceScans.userId, user.id)).orderBy(desc(faceScans.scanDate));
    return jsonOk({ scans: rows });
  });
}
