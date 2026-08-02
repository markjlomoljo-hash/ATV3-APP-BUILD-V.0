#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const migrationsDir = path.resolve(process.cwd(), "supabase", "migrations");
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required before Railway pre-deploy migrations can run.");
  process.exit(1);
}

function sslConfig() {
  const ca = process.env.SUPABASE_DB_CA_CERT?.trim().replace(/\\n/g, "\n");
  if (ca) return { ca, rejectUnauthorized: true };
  if (/sslmode=require/i.test(databaseUrl)) return { rejectUnauthorized: false };
  return undefined;
}

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: sslConfig(),
  max: 1,
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 10000,
  allowExitOnIdle: true,
});

const client = await pool.connect();
try {
  await client.query("begin");
  await client.query("select pg_advisory_xact_lock(hashtext('acnetrex_supabase_migrations'))");
  await client.query(`
    create schema if not exists public;
    create table if not exists public.schema_migrations (
      version text primary key,
      name text not null,
      applied_at timestamptz not null default now()
    )
  `);

  const files = (await readdir(migrationsDir))
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .sort();

  for (const file of files) {
    const version = file.split("_")[0];
    const existing = await client.query("select 1 from public.schema_migrations where version = $1", [version]);
    if (existing.rowCount) {
      console.log(`Skipping already-applied migration ${file}`);
      continue;
    }

    console.log(`Applying migration ${file}`);
    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    await client.query(sql);
    await client.query("insert into public.schema_migrations(version, name) values ($1, $2)", [version, file]);
  }

  await client.query("commit");
  console.log(`Railway migration pre-deploy complete (${files.length} migration files checked).`);
} catch (error) {
  await client.query("rollback").catch(() => undefined);
  console.error("Railway migration pre-deploy failed:", error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
