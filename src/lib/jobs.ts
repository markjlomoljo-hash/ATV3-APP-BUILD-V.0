import { db } from "@/db";
import { jobQueue } from "@/db/schema";

export type JobType =
  | "face_atlas_process"
  | "ocr_product_analysis"
  | "weather_snapshot"
  | "forecast_generate"
  | "skin_twin_simulate"
  | "report_generate"
  | "data_export"
  | "account_deletion"
  | "model_retrain";

/**
 * Enqueues a durable background job row. There is no in-process worker
 * running inside the web server; a separate worker process (see
 * `scripts/worker.ts`) or an external scheduler must poll this table.
 * This keeps request handlers fast and avoids doing heavy work inline.
 */
export async function enqueueJob(
  jobType: JobType,
  payload: Record<string, unknown>,
  opts: { userId?: string | null; runAfter?: Date } = {},
) {
  const [job] = await db
    .insert(jobQueue)
    .values({
      jobType,
      userId: opts.userId ?? null,
      payload,
      runAfter: opts.runAfter ?? new Date(),
    })
    .returning();
  return job;
}
