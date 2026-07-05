import { getDb, isDatabaseConfigurationError } from "@/db";
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
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <section className="w-full max-w-2xl rounded-3xl bg-white p-10 shadow-[0_24px_60px_rgba(16,24,40,0.12)]">
        <p className="m-0 text-sm uppercase tracking-[0.08em] text-slate-600">Starter template</p>
        <h1 className="mt-4 text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-[1.05] text-slate-950">
          Arena Next.js PostgreSQL Starter
        </h1>
        <p className="mt-4 text-base text-slate-700">
          Server-rendered with Next.js and Drizzle.
        </p>
        <p className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Database status: <span className="font-semibold">{databaseStatus}</span>. {statusCopy}
        </p>
      </section>
    </main>
  );
}
