import type { MobileMlJobStatusResponse } from "@acnetrex/ml-local-runtime/mobile-job-coordinator";

import { openPrivateDatabase } from "./private-database";

type PendingJobRow = {
  job_id: string;
  request_id: string;
};

type CachedResultRow = {
  response_json: string;
};

const allowedJobStatuses = new Set([
  "queued",
  "processing",
  "completed",
  "failed",
  "insufficient_data",
  "not_configured",
]);

async function openMlCache() {
  const database = await openPrivateDatabase();
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS ml_pending_jobs (
      user_id TEXT NOT NULL,
      job_id TEXT NOT NULL,
      request_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, job_id)
    );
    CREATE TABLE IF NOT EXISTS ml_job_results (
      user_id TEXT NOT NULL,
      job_id TEXT NOT NULL,
      response_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, job_id)
    );
    CREATE INDEX IF NOT EXISTS ml_job_results_user_updated_idx
      ON ml_job_results (user_id, updated_at DESC);
  `);
  return database;
}

function isCachedResponse(value: unknown): value is MobileMlJobStatusResponse {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const response = value as Record<string, unknown>;
  if (response.ok !== true || typeof response.job !== "object" || response.job === null || Array.isArray(response.job)) {
    return false;
  }
  const job = response.job as Record<string, unknown>;
  const analysis = job.analysis;
  return typeof job.id === "string" && job.id.length > 0 && job.id.length <= 160
    && typeof job.status === "string" && allowedJobStatuses.has(job.status)
    && (analysis === null
      || (typeof analysis === "object" && analysis !== null && !Array.isArray(analysis)));
}

export async function rememberPendingMlJob(userId: string, jobId: string, requestId: string) {
  const database = await openMlCache();
  await database.runAsync(
    `INSERT INTO ml_pending_jobs (user_id, job_id, request_id, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, job_id) DO UPDATE SET request_id=excluded.request_id`,
    [userId, jobId, requestId, new Date().toISOString()],
  );
}

export async function forgetPendingMlJob(userId: string, jobId: string) {
  const database = await openMlCache();
  await database.runAsync(
    "DELETE FROM ml_pending_jobs WHERE user_id = ? AND job_id = ?",
    [userId, jobId],
  );
}

export async function listPendingMlJobs(userId: string, limit = 20) {
  const database = await openMlCache();
  const boundedLimit = Math.min(Math.max(Math.floor(limit), 1), 50);
  return database.getAllAsync<PendingJobRow>(
    `SELECT job_id, request_id FROM ml_pending_jobs
     WHERE user_id = ? ORDER BY created_at ASC LIMIT ?`,
    [userId, boundedLimit],
  );
}

export async function cacheMlJobResult(userId: string, response: MobileMlJobStatusResponse) {
  const serialized = JSON.stringify(response);
  if (serialized.length > 262_144) throw new Error("ml_result_cache_payload_too_large");
  const database = await openMlCache();
  await database.runAsync(
    `INSERT INTO ml_job_results (user_id, job_id, response_json, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, job_id) DO UPDATE SET
       response_json=excluded.response_json, updated_at=excluded.updated_at`,
    [userId, response.job.id, serialized, new Date().toISOString()],
  );
}

export async function getLatestCachedMlJobResult(userId: string): Promise<MobileMlJobStatusResponse | null> {
  const database = await openMlCache();
  const row = await database.getFirstAsync<CachedResultRow>(
    `SELECT response_json FROM ml_job_results
     WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1`,
    [userId],
  );
  if (!row) return null;
  try {
    const parsed: unknown = JSON.parse(row.response_json);
    return isCachedResponse(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
