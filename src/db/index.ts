import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

// Use a singleton pool stored on the global object to avoid creating multiple connections.
const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

let pool: Pool | undefined;

if (databaseUrl) {
  // Initialize the pool only when a DATABASE_URL is provided.
  pool =
    globalForDb.__arenaNextJsPostgresqlPool ??
    new Pool({
      connectionString: databaseUrl,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__arenaNextJsPostgresqlPool = pool;
  }
} else {
  // Warn instead of throwing during build to allow fallback behaviour.
  console.warn(
    "Warning: DATABASE_URL is not defined; database connections will be disabled."
  );
}

// Export pool and db if available; else undefined to prevent usage without configuration.
export { pool };
export const db = pool ? drizzle(pool) : undefined;
