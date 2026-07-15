import { beforeEach, describe, expect, it, vi } from "vitest";

const { database, openPrivateDatabase } = vi.hoisted(() => ({
  database: {
    execAsync: vi.fn(),
    runAsync: vi.fn(),
    getAllAsync: vi.fn(),
    getFirstAsync: vi.fn(),
  },
  openPrivateDatabase: vi.fn(),
}));

vi.mock("../../../apps/mobile/src/lib/private-database", () => ({ openPrivateDatabase }));

import {
  cacheMlJobResult,
  getLatestCachedMlJobResult,
  listPendingMlJobs,
  rememberPendingMlJob,
} from "../../../apps/mobile/src/lib/ml-job-cache";

const userId = "11111111-1111-4111-8111-111111111111";

describe("encrypted mobile ML job cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    openPrivateDatabase.mockResolvedValue(database);
    database.execAsync.mockResolvedValue(undefined);
    database.runAsync.mockResolvedValue(undefined);
  });

  it("partitions pending references and durable results by the authenticated user", async () => {
    database.getAllAsync.mockResolvedValue([]);
    await rememberPendingMlJob(userId, "job-1", "request-1");
    await listPendingMlJobs(userId);
    await cacheMlJobResult(userId, {
      ok: true,
      job: { id: "job-1", status: "completed", analysis: { readinessState: "ready" } },
    });

    expect(database.runAsync.mock.calls[0]?.[1]).toEqual([
      userId,
      "job-1",
      "request-1",
      expect.any(String),
    ]);
    expect(database.getAllAsync.mock.calls[0]?.[1]).toEqual([userId, 20]);
    expect(database.runAsync.mock.calls[1]?.[1]?.[0]).toBe(userId);
  });

  it("rejects corrupted cached statuses instead of rendering untrusted local JSON", async () => {
    database.getFirstAsync.mockResolvedValue({
      response_json: JSON.stringify({
        ok: true,
        job: { id: "job-1", status: "invented_success", analysis: null },
      }),
    });

    await expect(getLatestCachedMlJobResult(userId)).resolves.toBeNull();
  });

  it("bounds locally cached result payloads", async () => {
    await expect(cacheMlJobResult(userId, {
      ok: true,
      job: {
        id: "job-large",
        status: "completed",
        analysis: { output: { value: "x".repeat(262_144) } },
      },
    })).rejects.toThrow("ml_result_cache_payload_too_large");
    expect(database.runAsync).not.toHaveBeenCalled();
  });
});
