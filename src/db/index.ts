import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaNextJsPostgresqlDb?: ReturnType<typeof drizzle>;
};

export class DatabaseConfigurationError extends Error {
  constructor() {
    super("DATABASE_URL is required");
    this.name = "DatabaseConfigurationError";
  }
}

export function isDatabaseConfigurationError(error: unknown): error is DatabaseConfigurationError {
  return error instanceof DatabaseConfigurationError;
}

function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new DatabaseConfigurationError();
  }
  return databaseUrl;
}

export function getPool(): Pool {
  if (!globalForDb.__arenaNextJsPostgresqlPool) {
    globalForDb.__arenaNextJsPostgresqlPool = new Pool({
      connectionString: getDatabaseUrl(),
    });
  }

  return globalForDb.__arenaNextJsPostgresqlPool;
}

export function getDb(): ReturnType<typeof drizzle> {
  if (!globalForDb.__arenaNextJsPostgresqlDb) {
    globalForDb.__arenaNextJsPostgresqlDb = drizzle(getPool());
  }

  return globalForDb.__arenaNextJsPostgresqlDb;
}

export type AppDb = ReturnType<typeof getDb>;
