import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Determine the database URL from environment variables.
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

// Create a drizzle instance only if a pool exists.
const drizzleDb = pool ? drizzle(pool) : undefined;

/**
 * Get a configured Drizzle database instance. When the database is not configured,
 * this throws an error at runtime to prevent silent failures.
 */
export function getDb() {
  if (!drizzleDb) {
    throw new Error(
      "DATABASE_URL is not configured; database operations are disabled."
    );
  }
  return drizzleDb;
}

/**
 * A potentially undefined Drizzle database instance. Use getDb() in request handlers
 * or service functions instead of accessing this export directly.
 */
export const db = drizzleDb;

// Re-export the underlying connection pool for lower-level integrations.
export { pool };
