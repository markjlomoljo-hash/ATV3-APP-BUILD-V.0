import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/lib/acnetrex/ml-analysis-worker", () => ({
  processNextMlAnalysisJob: vi.fn(),
}));

import { after } from "next/server";
import { processNextMlAnalysisJob } from "@/lib/acnetrex/ml-analysis-worker";
import { kickMlWorker, mlWorkerKickEnabled, runBoundedMlWorkerPass } from "./ml-worker-kick";

const afterHook = vi.mocked(after);
const worker = vi.mocked(processNextMlAnalysisJob);

function enableWorker() {
  vi.stubEnv("ACNETREX_ML_WORKER_ENABLED", "true");
  vi.stubEnv("ACNETREX_ML_WORKER_SECRET", "test-worker-secret-placeholder");
}

function scheduledPass(): () => Promise<void> {
  const pass = afterHook.mock.calls[0]?.[0];
  if (typeof pass !== "function") throw new Error("expected after() to receive a callback");
  return pass as () => Promise<void>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("kickMlWorker", () => {
  it("is a no-op when the worker enablement flag is off", () => {
    vi.stubEnv("ACNETREX_ML_WORKER_ENABLED", "false");
    vi.stubEnv("ACNETREX_ML_WORKER_SECRET", "test-worker-secret-placeholder");
    expect(mlWorkerKickEnabled()).toBe(false);
    expect(kickMlWorker("enqueue")).toEqual({ kicked: false, reason: "worker_not_configured" });
    expect(afterHook).not.toHaveBeenCalled();
    expect(worker).not.toHaveBeenCalled();
  });

  it("is a no-op when the worker secret is missing", () => {
    vi.stubEnv("ACNETREX_ML_WORKER_ENABLED", "true");
    vi.stubEnv("ACNETREX_ML_WORKER_SECRET", "");
    expect(kickMlWorker("status_read")).toEqual({ kicked: false, reason: "worker_not_configured" });
    expect(afterHook).not.toHaveBeenCalled();
    expect(worker).not.toHaveBeenCalled();
  });

  it("schedules a post-response pass through next/server after()", async () => {
    enableWorker();
    worker.mockResolvedValue({ status: "idle" });

    expect(kickMlWorker("enqueue")).toEqual({ kicked: true, mode: "after" });
    expect(afterHook).toHaveBeenCalledTimes(1);
    expect(worker).not.toHaveBeenCalled();

    await scheduledPass()();
    expect(worker).toHaveBeenCalledTimes(1);
    expect(worker).toHaveBeenCalledWith({ workerId: expect.stringMatching(/^ml-kick-enqueue-/) });
  });

  it("falls back to a detached pass when after() is unavailable", async () => {
    enableWorker();
    afterHook.mockImplementationOnce(() => {
      throw new Error("after() was called outside a request scope");
    });
    worker.mockResolvedValue({ status: "idle" });

    expect(kickMlWorker("status_read")).toEqual({ kicked: true, mode: "detached" });
    await vi.waitFor(() => expect(worker).toHaveBeenCalledTimes(1));
    expect(worker).toHaveBeenCalledWith({ workerId: expect.stringMatching(/^ml-kick-status_read-/) });
  });

  it("logs pass failures instead of propagating them", async () => {
    enableWorker();
    worker.mockRejectedValue(new Error("database_query_failed"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(kickMlWorker("enqueue")).toEqual({ kicked: true, mode: "after" });
    await expect(scheduledPass()()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(
      "[ml-worker-kick] opportunistic enqueue pass failed:",
      "database_query_failed",
    );
    warn.mockRestore();
  });
});

describe("runBoundedMlWorkerPass", () => {
  it("processes at most the configured batch size", async () => {
    vi.stubEnv("ML_WORKER_KICK_MAX_JOBS", "3");
    worker.mockResolvedValue({ status: "completed", jobId: "job-1", outboxId: "outbox-1" });

    const outcomes = await runBoundedMlWorkerPass({ source: "enqueue" });
    expect(outcomes).toHaveLength(3);
    expect(worker).toHaveBeenCalledTimes(3);
  });

  it("stops as soon as the queue is idle", async () => {
    vi.stubEnv("ML_WORKER_KICK_MAX_JOBS", "5");
    worker
      .mockResolvedValueOnce({ status: "completed", jobId: "job-1", outboxId: "outbox-1" })
      .mockResolvedValueOnce({ status: "idle" });

    const outcomes = await runBoundedMlWorkerPass({ source: "enqueue" });
    expect(outcomes).toEqual([
      { status: "completed", jobId: "job-1", outboxId: "outbox-1" },
      { status: "idle" },
    ]);
    expect(worker).toHaveBeenCalledTimes(2);
  });

  it("stops when the time budget is exhausted", async () => {
    vi.stubEnv("ML_WORKER_KICK_MAX_JOBS", "5");
    vi.stubEnv("ML_WORKER_KICK_BUDGET_MS", "1000");
    // startedAt, first loop check (within budget), second loop check (over budget).
    const ticks = [0, 0, 5_000];
    const now = vi.fn(() => ticks.shift() ?? 5_000);
    worker.mockResolvedValue({ status: "completed", jobId: "job-1", outboxId: "outbox-1" });

    const outcomes = await runBoundedMlWorkerPass({ source: "status_read", now });
    expect(outcomes).toHaveLength(1);
    expect(worker).toHaveBeenCalledTimes(1);
  });

  it("clamps invalid tuning values back to safe defaults", async () => {
    vi.stubEnv("ML_WORKER_KICK_MAX_JOBS", "not-a-number");
    worker.mockResolvedValue({ status: "completed", jobId: "job-1", outboxId: "outbox-1" });

    const outcomes = await runBoundedMlWorkerPass({ source: "enqueue" });
    expect(outcomes).toHaveLength(2);
    expect(worker).toHaveBeenCalledTimes(2);
  });

  it.each([
    { raw: "0", expectedJobs: 1, label: "zero clamps up to the minimum of one job" },
    { raw: "-4", expectedJobs: 1, label: "negative values clamp up to the minimum of one job" },
    { raw: "9999", expectedJobs: 5, label: "huge values clamp down to the batch ceiling of five" },
    { raw: "3.9", expectedJobs: 3, label: "fractional values floor to a whole job count" },
    { raw: "0.4", expectedJobs: 1, label: "sub-one fractions floor then clamp up to one job" },
  ])("clamps out-of-range ML_WORKER_KICK_MAX_JOBS: $label", async ({ raw, expectedJobs }) => {
    vi.stubEnv("ML_WORKER_KICK_MAX_JOBS", raw);
    worker.mockResolvedValue({ status: "completed", jobId: "job-1", outboxId: "outbox-1" });

    const outcomes = await runBoundedMlWorkerPass({ source: "enqueue" });
    expect(outcomes).toHaveLength(expectedJobs);
    expect(worker).toHaveBeenCalledTimes(expectedJobs);
  });
});
