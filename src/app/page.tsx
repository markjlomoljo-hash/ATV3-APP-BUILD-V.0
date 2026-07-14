import { getDb, isDatabaseConfigurationError } from "@/db";
import { DashboardHome } from "@/components/acnetrex/ModulePage";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let databaseStatus: "connected" | "not_configured" | "unavailable" = "connected";

  try {
    const db = getDb();
    await db.execute(sql`select 1`);
  } catch (error) {
    databaseStatus = isDatabaseConfigurationError(error) ? "not_configured" : "unavailable";
  }

  const statusCopy =
    databaseStatus === "connected"
      ? "PostgreSQL is reachable from this deployment."
      : databaseStatus === "not_configured"
        ? "DATABASE_URL is not configured for this deployment."
        : "DATABASE_URL is configured, but PostgreSQL is not reachable from this deployment.";

  return (
    <>
      <DashboardHome />
      <div className="bg-slate-100 px-4 pb-8 md:px-8">
        <div className="mx-auto max-w-7xl rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          Database status: <span className="font-semibold">{databaseStatus}</span>. {statusCopy}
        </div>
      </div>
    </>
  );
}
