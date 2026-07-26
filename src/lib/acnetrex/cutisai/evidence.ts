// AcneTrex V3 — CutisAI evidence retrieval.
//
// Every evidence bundle is read directly from the user's own persisted rows
// on the caller's transaction client. Nothing here derives, scores, or
// invents values — it returns raw column values plus one EvidenceRef per row
// so replies can cite exactly the records they were built from. Legacy
// tables (sleep_logs, food_logs, trigger_hypotheses, treatment_checkins,
// forecast_summaries, face_atlas_scans, daily_logs) key user_id as text;
// canonical Phase 7 tables (gamification, user_badges, user_memory_facts)
// key user_id as uuid.
import type { PoolClient } from "pg";

export type CutisAiEvidenceRef = {
  source: "user_record" | "curated_content";
  table: string;
  id: string;
  summary: string;
};

export function userRecordRef(table: string, id: string, summary: string): CutisAiEvidenceRef {
  return { source: "user_record", table, id, summary };
}

export function curatedContentRef(id: string, summary: string): CutisAiEvidenceRef {
  return { source: "curated_content", table: "module_registry", id, summary };
}

export type GamificationEvidence = {
  state: {
    id: string;
    currentStreak: number;
    longestStreak: number;
    points: number;
    rank: string | null;
    petStage: string;
    petXp: number;
    lastActionAt: string | null;
  } | null;
  badges: Array<{ id: string; code: string; earnedAt: string }>;
  refs: CutisAiEvidenceRef[];
};

export async function retrieveGamificationEvidence(
  client: PoolClient,
  userId: string,
): Promise<GamificationEvidence> {
  const stateResult = await client.query<{
    id: string;
    currentStreak: number;
    longestStreak: number;
    points: number;
    rank: string | null;
    petStage: string;
    petXp: number;
    lastActionAt: string | null;
  }>(
    `select id, current_streak as "currentStreak", longest_streak as "longestStreak",
            points, rank, pet_stage as "petStage", pet_xp as "petXp",
            last_action_at::text as "lastActionAt"
       from public.gamification
      where user_id = $1::uuid
      limit 1`,
    [userId],
  );
  const badgesResult = await client.query<{ id: string; code: string; earnedAt: string }>(
    `select ub.id, b.code, ub.earned_at::text as "earnedAt"
       from public.user_badges ub
       join public.badges b on b.id = ub.badge_id
      where ub.user_id = $1::uuid
      order by ub.earned_at asc
      limit 50`,
    [userId],
  );
  const state = stateResult.rows[0] ?? null;
  const refs: CutisAiEvidenceRef[] = [];
  if (state) refs.push(userRecordRef("gamification", state.id, "persisted streak and progress state"));
  for (const badge of badgesResult.rows) {
    refs.push(userRecordRef("user_badges", badge.id, `badge ${badge.code}`));
  }
  return { state, badges: badgesResult.rows, refs };
}

export type SleepLogEvidence = {
  totalCount: number;
  recent: Array<{
    id: string;
    logDate: string;
    quality: number | null;
    sleepTime: string | null;
    wakeTime: string | null;
  }>;
  refs: CutisAiEvidenceRef[];
};

export async function retrieveSleepLogEvidence(client: PoolClient, userId: string): Promise<SleepLogEvidence> {
  const countResult = await client.query<{ count: string }>(
    `select count(*)::text as count from public.sleep_logs where user_id = $1`,
    [userId],
  );
  const rowsResult = await client.query<{
    id: string;
    logDate: string;
    quality: number | null;
    sleepTime: string | null;
    wakeTime: string | null;
  }>(
    `select id, log_date::text as "logDate", quality, sleep_time::text as "sleepTime", wake_time::text as "wakeTime"
       from public.sleep_logs
      where user_id = $1
      order by log_date desc
      limit 7`,
    [userId],
  );
  return {
    totalCount: Number(countResult.rows[0]?.count ?? "0"),
    recent: rowsResult.rows,
    refs: rowsResult.rows.map((row) => userRecordRef("sleep_logs", row.id, `sleep log ${row.logDate}`)),
  };
}

export type FoodLogEvidence = {
  totalCount: number;
  recent: Array<{ id: string; logDate: string; mealType: string; isBaseline: boolean; completed: boolean }>;
  refs: CutisAiEvidenceRef[];
};

export async function retrieveFoodLogEvidence(client: PoolClient, userId: string): Promise<FoodLogEvidence> {
  const countResult = await client.query<{ count: string }>(
    `select count(*)::text as count from public.food_logs where user_id = $1`,
    [userId],
  );
  const rowsResult = await client.query<{
    id: string;
    logDate: string;
    mealType: string;
    isBaseline: boolean;
    completed: boolean;
  }>(
    `select id, log_date::text as "logDate", meal_type as "mealType", is_baseline as "isBaseline", completed
       from public.food_logs
      where user_id = $1
      order by log_date desc, created_at desc
      limit 10`,
    [userId],
  );
  return {
    totalCount: Number(countResult.rows[0]?.count ?? "0"),
    recent: rowsResult.rows,
    refs: rowsResult.rows.map((row) =>
      userRecordRef("food_logs", row.id, `${row.mealType} log ${row.logDate}`),
    ),
  };
}

export type TriggerEvidence = {
  hypotheses: Array<{
    id: string;
    triggerName: string;
    status: string;
    evidenceCount: number;
    updatedAt: string;
  }>;
  refs: CutisAiEvidenceRef[];
};

export async function retrieveTriggerEvidence(client: PoolClient, userId: string): Promise<TriggerEvidence> {
  const result = await client.query<{
    id: string;
    triggerName: string;
    status: string;
    evidenceCount: number;
    updatedAt: string;
  }>(
    `select id, trigger_name as "triggerName", status, evidence_count as "evidenceCount",
            updated_at::text as "updatedAt"
       from public.trigger_hypotheses
      where user_id = $1
      order by evidence_count desc, trigger_name asc
      limit 10`,
    [userId],
  );
  return {
    hypotheses: result.rows,
    refs: result.rows.map((row) =>
      userRecordRef("trigger_hypotheses", row.id, `hypothesis ${row.triggerName}`),
    ),
  };
}

export type TreatmentCheckinEvidence = {
  totalCount: number;
  recent: Array<{ id: string; checkinDate: string; status: string; irritation: number | null }>;
  statusCounts: Record<string, number>;
  refs: CutisAiEvidenceRef[];
};

export async function retrieveTreatmentCheckinEvidence(
  client: PoolClient,
  userId: string,
): Promise<TreatmentCheckinEvidence> {
  const countResult = await client.query<{ count: string }>(
    `select count(*)::text as count from public.treatment_checkins where user_id = $1`,
    [userId],
  );
  const rowsResult = await client.query<{
    id: string;
    checkinDate: string;
    status: string;
    irritation: number | null;
  }>(
    `select id, checkin_date::text as "checkinDate", status, irritation
       from public.treatment_checkins
      where user_id = $1
      order by checkin_date desc
      limit 14`,
    [userId],
  );
  const statusCounts: Record<string, number> = {};
  for (const row of rowsResult.rows) {
    statusCounts[row.status] = (statusCounts[row.status] ?? 0) + 1;
  }
  return {
    totalCount: Number(countResult.rows[0]?.count ?? "0"),
    recent: rowsResult.rows,
    statusCounts,
    refs: rowsResult.rows.map((row) =>
      userRecordRef("treatment_checkins", row.id, `check-in ${row.checkinDate} (${row.status})`),
    ),
  };
}

export type ForecastEvidence = {
  summaries: Array<{
    id: string;
    window: string;
    status: string;
    summary: string | null;
    confidence: string | null;
    createdAt: string;
  }>;
  refs: CutisAiEvidenceRef[];
};

export async function retrieveForecastEvidence(client: PoolClient, userId: string): Promise<ForecastEvidence> {
  const result = await client.query<{
    id: string;
    window: string;
    status: string;
    summary: string | null;
    confidence: string | null;
    createdAt: string;
  }>(
    `select id, "window", status, summary, confidence, created_at::text as "createdAt"
       from public.forecast_summaries
      where user_id = $1
      order by created_at desc
      limit 4`,
    [userId],
  );
  return {
    summaries: result.rows,
    refs: result.rows.map((row) => userRecordRef("forecast_summaries", row.id, `forecast window ${row.window}`)),
  };
}

export type ScanEvidence = {
  totalCount: number;
  recent: Array<{
    id: string;
    scanDate: string;
    userLesionCount: number | null;
    modelLesionCount: number | null;
    confidence: string;
  }>;
  refs: CutisAiEvidenceRef[];
};

export async function retrieveScanEvidence(client: PoolClient, userId: string): Promise<ScanEvidence> {
  const countResult = await client.query<{ count: string }>(
    `select count(*)::text as count from public.face_atlas_scans where user_id = $1`,
    [userId],
  );
  const rowsResult = await client.query<{
    id: string;
    scanDate: string;
    userLesionCount: number | null;
    modelLesionCount: number | null;
    confidence: string;
  }>(
    `select id, scan_date::text as "scanDate", user_lesion_count as "userLesionCount",
            model_lesion_count as "modelLesionCount", confidence
       from public.face_atlas_scans
      where user_id = $1
      order by scan_date desc
      limit 5`,
    [userId],
  );
  return {
    totalCount: Number(countResult.rows[0]?.count ?? "0"),
    recent: rowsResult.rows,
    refs: rowsResult.rows.map((row) => userRecordRef("face_atlas_scans", row.id, `scan ${row.scanDate}`)),
  };
}

export type MemoryFactEvidence = {
  facts: Array<{ id: string; factKey: string; factValue: unknown; updatedAt: string }>;
  refs: CutisAiEvidenceRef[];
};

export async function retrieveMemoryFactEvidence(
  client: PoolClient,
  userId: string,
): Promise<MemoryFactEvidence> {
  const result = await client.query<{
    id: string;
    factKey: string;
    factValue: unknown;
    updatedAt: string;
  }>(
    `select id, fact_key as "factKey", fact_value as "factValue", updated_at::text as "updatedAt"
       from public.user_memory_facts
      where user_id = $1::uuid and deleted_at is null
        and (valid_until is null or valid_until > now())
      order by fact_key asc
      limit 50`,
    [userId],
  );
  return {
    facts: result.rows,
    refs: result.rows.map((row) => userRecordRef("user_memory_facts", row.id, `stated fact ${row.factKey}`)),
  };
}
