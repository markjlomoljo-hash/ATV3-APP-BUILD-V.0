import { getDb, isDatabaseConfigurationError } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    await db.execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch (error) {
    if (isDatabaseConfigurationError(error)) {
      return Response.json({ ok: false, error: "database_not_configured" }, { status: 503 });
    }
    return Response.json({ ok: false, error: "database_unavailable" }, { status: 503 });
  }
}
