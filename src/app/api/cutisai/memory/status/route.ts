import { getDb, isDatabaseConfigurationError } from "@/db";
import { buildCutisAiMemoryReadiness } from "@/lib/acnetrex/memory/readiness";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    const tableRows = await db.execute<{ table_name: string }>(sql`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
    `);
    const readiness = buildCutisAiMemoryReadiness(tableRows.rows.map((row) => row.table_name));

    return Response.json(
      {
        ok: readiness.ok,
        service: "cutisai-memory",
        readiness,
        updatedAt: new Date().toISOString(),
      },
      { status: readiness.ok ? 200 : 503 },
    );
  } catch (error) {
    const status = isDatabaseConfigurationError(error) ? "database_not_configured" : "database_unavailable";

    return Response.json(
      {
        ok: false,
        service: "cutisai-memory",
        error: status,
        readiness: buildCutisAiMemoryReadiness([]),
        updatedAt: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
