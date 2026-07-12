import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";

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

export class DatabaseTlsConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseTlsConfigurationError";
  }
}

export function isDatabaseTlsConfigurationError(
  error: unknown,
): error is DatabaseTlsConfigurationError {
  return error instanceof DatabaseTlsConfigurationError;
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

function normalizeCaCertificate(value: string): string {
  const certificate = value.trim().replace(/\\n/g, "\n");
  if (
    !certificate.includes("-----BEGIN CERTIFICATE-----") ||
    !certificate.includes("-----END CERTIFICATE-----")
  ) {
    throw new DatabaseTlsConfigurationError(
      "SUPABASE_DB_CA_CERT must contain a PEM encoded CA certificate",
    );
  }
  return certificate;
}

/**
 * Build a server-side pg configuration. When a Supabase CA certificate is
 * supplied, TLS remains fully verified. SSL query parameters are removed from
 * the URI because node-postgres otherwise replaces the explicit `ssl.ca`
 * object while parsing the connection string.
 */
export function buildDatabasePoolConfig(
  databaseUrl: string,
  caCertificate?: string,
): PoolConfig {
  const baseConfig: PoolConfig = {
    connectionString: databaseUrl,
    max: 5,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 10_000,
    allowExitOnIdle: true,
  };

  if (!caCertificate?.trim()) return baseConfig;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    throw new DatabaseTlsConfigurationError("DATABASE_URL is not a valid PostgreSQL URL");
  }

  for (const parameter of [
    "sslmode",
    "sslrootcert",
    "sslcert",
    "sslkey",
    "uselibpqcompat",
  ]) {
    parsedUrl.searchParams.delete(parameter);
  }

  return {
    ...baseConfig,
    connectionString: parsedUrl.toString(),
    ssl: {
      ca: normalizeCaCertificate(caCertificate),
      rejectUnauthorized: true,
    },
  };
}

export function getPool(): Pool {
  if (!globalForDb.__arenaNextJsPostgresqlPool) {
    globalForDb.__arenaNextJsPostgresqlPool = new Pool(
      buildDatabasePoolConfig(getDatabaseUrl(), process.env.SUPABASE_DB_CA_CERT),
    );
  }

  return globalForDb.__arenaNextJsPostgresqlPool;
}

export function getDb(): ReturnType<typeof drizzle> {
  if (!globalForDb.__arenaNextJsPostgresqlDb) {
    globalForDb.__arenaNextJsPostgresqlDb = drizzle(getPool());
  }

  return globalForDb.__arenaNextJsPostgresqlDb;
}

export const db = process.env.DATABASE_URL
  ? (globalForDb.__arenaNextJsPostgresqlDb ?? drizzle(getPool()))
  : undefined;

export type AppDb = ReturnType<typeof getDb>;
