import type { PoolClient } from "pg";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ getPool: vi.fn() }));

import { getPool } from "@/db";
import {
  SkinTwinConsentRequiredError,
  createSkinTwinScenario,
  deleteSkinTwinScenario,
  getSkinTwinScenario,
  listSkinTwinScenarios,
  skinTwinScenarioRequestSchema,
  type SkinTwinScenarioRequest,
} from "./scenarios";

const pool = vi.mocked(getPool);
const userId = "00000000-0000-4000-8000-000000000001";
const snapshotId = "11111111-1111-4111-8111-111111111111";

const input: SkinTwinScenarioRequest = {
  name: "Better sleep",
  window: "7d" as const,
  variables: ["better_sleep"],
  sourceRecordRefs: [],
  providerReview: false,
};

function clientWithResponses(responses: Array<{ rows?: unknown[] }>) {
  const query = vi.fn(async (..._args: unknown[]) => responses.shift() ?? { rows: [] });
  const client = { query, release: vi.fn() } as unknown as PoolClient;
  return { client, query };
}

function snapshot(status: "insufficient_data" | "queued_for_cloud") {
  return {
    id: snapshotId,
    scenario: "Better sleep",
    window: "7d",
    status,
    variables: ["better_sleep"],
    sourceRecordRefs: [],
    confidence: "insufficient_data",
    modelVersion: null,
    simulation: null,
    uncertainty: null,
    snapshotAt: "2026-07-13T00:00:00.000Z",
  };
}

describe("Skin Twin scenario service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires personal-learning consent before persisting a scenario", async () => {
    const { client } = clientWithResponses([{ rows: [{ personalLearning: false }] }]);
    await expect(createSkinTwinScenario(client, userId, input)).rejects.toBeInstanceOf(SkinTwinConsentRequiredError);
  });

  it("requires provider review for a custom timeline", () => {
    const result = skinTwinScenarioRequestSchema.safeParse({ ...input, window: "provider_review_custom", providerReview: false });
    expect(result.success).toBe(false);
    expect(skinTwinScenarioRequestSchema.safeParse({
      ...input,
      window: "provider_review_custom",
      providerReview: true,
    }).success).toBe(false);
    expect(skinTwinScenarioRequestSchema.safeParse({
      ...input,
      window: "provider_review_custom",
      providerReview: true,
      providerReviewContext: "Review planned with treating dermatologist",
    }).success).toBe(true);
  });

  it("validates a scenario again at the persistence boundary", async () => {
    const { client, query } = clientWithResponses([]);

    await expect(createSkinTwinScenario(client, userId, {
      ...input,
      variables: ["unsupported_client_variable"],
    } as never)).rejects.toThrow();

    expect(query).not.toHaveBeenCalled();
  });

  it("persists insufficient-data scenarios without fabricating simulation output", async () => {
    const { client, query } = clientWithResponses([
      { rows: [{ personalLearning: true }] },
      { rows: [{ faceScans: 0, sleepLogs: 0, foodLogs: 0 }] },
      { rows: [snapshot("insufficient_data")] },
      { rows: [] },
    ]);
    const result = await createSkinTwinScenario(client, userId, input);
    expect(result.status).toBe("insufficient_data");
    expect(result.snapshot.simulation).toBeNull();
    expect(JSON.stringify(query.mock.calls)).not.toContain("Math.random");
  });

  it("queues only when real source records meet the minimum gate", async () => {
    const { client, query } = clientWithResponses([
      { rows: [{ personalLearning: true }] },
      { rows: [{ faceScans: 2, sleepLogs: 8, foodLogs: 8 }] },
      { rows: [snapshot("queued_for_cloud")] },
      { rows: [{ id: "99999999-9999-4999-8999-999999999999" }] },
      { rows: [{ id: "88888888-8888-4888-8888-888888888888" }] },
      { rows: [] },
    ]);
    const result = await createSkinTwinScenario(client, userId, input);
    expect(result.status).toBe("queued_for_cloud");
    expect(result.snapshot.simulation).toBeNull();
    expect(JSON.stringify(query.mock.calls)).toContain(snapshotId);
    const jobInsert = query.mock.calls.find(([sql]) => String(sql).includes("insert into public.ml_analysis_jobs"));
    expect(String(jobInsert?.[0])).toContain("request_id");
    expect(String(jobInsert?.[0])).toContain("idempotency_key");
    expect(String(jobInsert?.[0])).toContain("payload_hash");
    expect(String(jobInsert?.[0])).toContain("consent_snapshot");
    expect(String(jobInsert?.[0])).toContain("personal_processing");
  });

  it("fails the scenario transaction when its durable outbox event is missing", async () => {
    const { client } = clientWithResponses([
      { rows: [{ personalLearning: true }] },
      { rows: [{ faceScans: 2, sleepLogs: 8, foodLogs: 8 }] },
      { rows: [snapshot("queued_for_cloud")] },
      { rows: [{ id: "99999999-9999-4999-8999-999999999999" }] },
      { rows: [] },
    ]);

    await expect(createSkinTwinScenario(client, userId, input)).rejects.toThrow("skin_twin_outbox_insert_missing");
  });

  it("loads only owner-scoped scenario history", async () => {
    const { client, query } = clientWithResponses([{ rows: [snapshot("insufficient_data")] }]);
    pool.mockReturnValue({ query } as never);
    const result = await listSkinTwinScenarios(userId);
    expect(result[0]?.id).toBe(snapshotId);
    expect(result[0]?.variables).toEqual(["better_sleep"]);
    expect(query.mock.calls[0]?.[0]).toContain("where user_id = $1::uuid");
  });

  it("does not disclose a foreign scenario", async () => {
    const { client, query } = clientWithResponses([{ rows: [] }]);
    const result = await getSkinTwinScenario(userId, snapshotId, client);
    expect(result).toBeNull();
    expect(query.mock.calls[0]?.[0]).toContain("where id = $1::uuid and user_id = $2::uuid");
  });

  it("deletes only an owner-scoped scenario and writes its audit event atomically", async () => {
    const { client, query } = clientWithResponses([{ rows: [{ targetId: snapshotId }] }]);
    const deleted = await deleteSkinTwinScenario(userId, snapshotId, client);

    expect(deleted).toBe(true);
    expect(String(query.mock.calls[0]?.[0])).toContain("where id = $1::uuid and user_id = $2::uuid");
    expect(String(query.mock.calls[0]?.[0])).toContain("skin_twin_scenario_deleted");
  });
});
