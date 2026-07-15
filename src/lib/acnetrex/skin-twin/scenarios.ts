import "server-only";

import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import { getPool } from "@/db";
import { skinTwinScenarioSchema } from "@/lib/acnetrex/modules/schemas";
import { requestHash } from "@/lib/reliability/idempotency";

export const skinTwinScenarioRequestSchema = skinTwinScenarioSchema.superRefine((value, context) => {
  if (value.window === "provider_review_custom" && !value.providerReview) {
    context.addIssue({ code: "custom", path: ["providerReview"], message: "Provider review is required for a custom timeline" });
  }
});

export type SkinTwinScenarioRequest = z.infer<typeof skinTwinScenarioRequestSchema>;
export type SkinTwinScenarioStatus = "insufficient_data" | "queued_for_cloud" | "completed" | "failed";

export type SkinTwinScenario = {
  id: string;
  name: string;
  window: SkinTwinScenarioRequest["window"];
  status: SkinTwinScenarioStatus;
  sourceRecordRefs: unknown[];
  confidence: string | null;
  modelVersion: string | null;
  simulation: unknown;
  uncertainty: unknown;
  snapshotAt: string;
};

export class SkinTwinConsentRequiredError extends Error {
  constructor() {
    super("personal_learning_consent_required");
    this.name = "SkinTwinConsentRequiredError";
  }
}

type SnapshotRow = {
  id: string;
  scenario: string | null;
  window: SkinTwinScenarioRequest["window"] | null;
  status: SkinTwinScenarioStatus;
  sourceRecordRefs: unknown[];
  confidence: string | null;
  modelVersion: string | null;
  simulation: unknown;
  uncertainty: unknown;
  snapshotAt: string | Date;
};

type CountsRow = { faceScans: number | string; sleepLogs: number | string; foodLogs: number | string };

function toNumber(value: number | string | undefined): number {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

function mapSnapshot(row: SnapshotRow): SkinTwinScenario {
  return {
    id: row.id,
    name: row.scenario ?? "Untitled scenario",
    window: row.window ?? "7d",
    status: row.status,
    sourceRecordRefs: Array.isArray(row.sourceRecordRefs) ? row.sourceRecordRefs : [],
    confidence: row.confidence,
    modelVersion: row.modelVersion,
    simulation: row.simulation,
    uncertainty: row.uncertainty,
    snapshotAt: toIso(row.snapshotAt),
  };
}

async function requirePersonalLearningConsent(client: PoolClient, userId: string) {
  const result = await client.query<{ personalLearning: boolean }>(
    `select personal_learning as "personalLearning"
       from public.consents
      where user_id = $1::uuid
      limit 1`,
    [userId],
  );
  if (result.rows[0]?.personalLearning !== true) throw new SkinTwinConsentRequiredError();
}

async function sourceCounts(client: PoolClient, userId: string): Promise<CountsRow> {
  const result = await client.query<CountsRow>(
    `select
       (select count(*) from public.face_scans where user_id = $1::uuid) as "faceScans",
       (select count(*) from public.sleep_logs where user_id = $1::uuid) as "sleepLogs",
       (select count(*) from public.food_logs where user_id = $1::uuid) as "foodLogs"`,
    [userId],
  );
  return result.rows[0] ?? { faceScans: 0, sleepLogs: 0, foodLogs: 0 };
}

function minimumDataMet(counts: CountsRow): boolean {
  return toNumber(counts.faceScans) >= 1 && toNumber(counts.sleepLogs) >= 3 && toNumber(counts.foodLogs) >= 3;
}

export async function createSkinTwinScenario(
  client: PoolClient,
  userId: string,
  input: SkinTwinScenarioRequest,
): Promise<{ snapshot: SkinTwinScenario; status: SkinTwinScenarioStatus }> {
  const parsedInput = skinTwinScenarioRequestSchema.parse(input);
  const parsedUserId = z.string().uuid().parse(userId);
  await requirePersonalLearningConsent(client, parsedUserId);
  const counts = await sourceCounts(client, parsedUserId);
  const ready = minimumDataMet(counts);
  const status: SkinTwinScenarioStatus = ready ? "queued_for_cloud" : "insufficient_data";
  const sourceRefs = parsedInput.sourceRecordRefs;
  const payload = JSON.stringify(parsedInput);
  const inserted = await client.query<SnapshotRow>(
    `insert into public.skin_twin_snapshots
       (user_id, scenario, scenario_payload, "window", status, source_record_refs,
        confidence, simulation, uncertainty)
     values ($1::uuid, $2, $3::jsonb, $4, $5, $6::jsonb, 'insufficient_data', null, null)
     returning id, scenario, "window", status, source_record_refs as "sourceRecordRefs",
               confidence, model_version as "modelVersion", simulation, uncertainty,
               snapshot_at as "snapshotAt"`,
    [parsedUserId, parsedInput.name, payload, parsedInput.window, status, JSON.stringify(sourceRefs)],
  );
  const row = inserted.rows[0];
  if (!row) throw new Error("skin_twin_snapshot_insert_missing");
  const featurePayload = { snapshotId: row.id, sourceCounts: counts, variables: parsedInput.variables, window: parsedInput.window };
  const features = JSON.stringify(featurePayload);

  if (ready) {
    const requestId = randomUUID();
    const idempotencyKey = `skin-twin:${parsedUserId}:${row.id}`;
    const payloadHash = requestHash({
      engine: "skin_twin",
      operation: "scenario_simulation",
      inputRecordRefs: sourceRefs,
      features: featurePayload,
    });
    const job = await client.query<{ id: string }>(
      `insert into public.ml_analysis_jobs
         (user_id, engine, operation, runtime_mode, status, input_record_refs,
          feature_schema_version, features, features_missing, schema_version,
          request_id, idempotency_key, module, task, payload_hash, consent_snapshot)
       values ($1::uuid, 'skin_twin', 'scenario_simulation', 'queued_for_cloud', 'queued',
               $2::jsonb, 'skin-twin-v1', $3::jsonb, '[]'::jsonb, '1',
               $4::uuid, $5, 'skin_twin', 'scenario_validation', $6,
               coalesce((
                 select jsonb_build_object(
                   'personal_processing', c.personal_processing,
                   'raw_image_processing', c.raw_image_processing,
                   'raw_image_retention', c.raw_image_retention,
                   'personal_learning', c.personal_learning,
                   'anonymous_learning', c.anonymous_learning,
                   'consented_at', c.consented_at,
                   'captured_at', now()
                 ) from public.consents c where c.user_id=$1::uuid
               ), jsonb_build_object(
                 'personal_processing', false,
                 'raw_image_processing', false,
                 'raw_image_retention', false,
                 'personal_learning', false,
                 'anonymous_learning', false,
                 'consented_at', null,
                 'captured_at', now()
               )))
       returning id`,
      [parsedUserId, JSON.stringify(sourceRefs), features, requestId, idempotencyKey, payloadHash],
    );
    if (!job.rows[0]) throw new Error("skin_twin_job_insert_missing");
    const outbox = await client.query<{ id: string }>(
      `insert into public.outbox_events
         (event_type, aggregate_type, aggregate_id, user_id, payload, deduplication_key)
       values ('ml.analysis.requested', 'ml_analysis_job', $1::uuid, $2::uuid, $3::jsonb, $4)
       on conflict (user_id, event_type, deduplication_key)
         where user_id is not null do nothing
       returning id`,
      [job.rows[0].id, parsedUserId, JSON.stringify({ jobId: job.rows[0].id, snapshotId: row.id, engine: "skin_twin" }), idempotencyKey],
    );
    if (!outbox.rows[0]) throw new Error("skin_twin_outbox_insert_missing");
  }

  await client.query(
    `insert into public.audit_logs
       (user_id, actor_type, action, target_table, target_id, metadata)
     values ($1::uuid, 'user', 'skin_twin_scenario_created', 'skin_twin_snapshots', $2::uuid, $3::jsonb)`,
    [parsedUserId, row.id, JSON.stringify({ status, window: parsedInput.window, variables: parsedInput.variables, sourceCounts: counts })],
  );
  return { snapshot: mapSnapshot(row), status };
}

export async function listSkinTwinScenarios(userId: string): Promise<SkinTwinScenario[]> {
  const result = await getPool().query<SnapshotRow>(
    `select id, scenario, "window", status, source_record_refs as "sourceRecordRefs",
            confidence, model_version as "modelVersion", simulation, uncertainty,
            snapshot_at as "snapshotAt"
       from public.skin_twin_snapshots
      where user_id = $1::uuid
      order by snapshot_at desc
      limit 50`,
    [userId],
  );
  return result.rows.map(mapSnapshot);
}

export async function getSkinTwinScenario(userId: string, scenarioId: string, clientOrPool?: PoolClient | Pool): Promise<SkinTwinScenario | null> {
  const queryable = clientOrPool ?? getPool();
  const result = await queryable.query<SnapshotRow>(
    `select id, scenario, "window", status, source_record_refs as "sourceRecordRefs",
            confidence, model_version as "modelVersion", simulation, uncertainty,
            snapshot_at as "snapshotAt"
       from public.skin_twin_snapshots
      where id = $1::uuid and user_id = $2::uuid
      limit 1`,
    [scenarioId, userId],
  );
  return result.rows[0] ? mapSnapshot(result.rows[0]) : null;
}
