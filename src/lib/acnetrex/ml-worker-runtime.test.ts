import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import {
  MlWorkerConfigurationError,
  buildMlWorkerRuntimeConfig,
  createMlWorkerRuntimeState,
  mlWorkerHealthResponse,
  runMlWorkerLoop,
} from "./ml-worker-runtime";

const requiredEnvironment = {
  DATABASE_URL: "postgresql://example.invalid/acnetrex",
  SUPABASE_DB_CA_CERT: "certificate-present",
  ACNETREX_ML_API_URL: "https://ml.example.test",
  ACNETREX_ML_SHARED_SECRET: "secret-present",
};

describe("persistent ML worker runtime", () => {
  it("starts paused without database secrets when the worker is explicitly disabled", async () => {
    const config = buildMlWorkerRuntimeConfig({ ACNETREX_ML_WORKER_ENABLED: "false" });
    const state = createMlWorkerRuntimeState("2026-07-14T00:00:00.000Z");
    const processBatch = vi.fn();

    expect(config).toMatchObject({ enabled: false });

    await runMlWorkerLoop({ config, state, processBatch, maxCycles: 1 });

    expect(processBatch).not.toHaveBeenCalled();
    expect(state).toMatchObject({ ready: true, lastOutcome: "paused" });
  });

  it("keeps the health server alive while dispatch is paused", async () => {
    const config = buildMlWorkerRuntimeConfig({ ACNETREX_ML_WORKER_ENABLED: "false" });
    const state = createMlWorkerRuntimeState("2026-07-14T00:00:00.000Z");
    const processBatch = vi.fn();
    const sleep = vi.fn().mockResolvedValue(undefined);

    await runMlWorkerLoop({ config, state, processBatch, sleep, maxCycles: 2 });

    expect(processBatch).not.toHaveBeenCalled();
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(config.pollIntervalMs, expect.any(AbortSignal));
  });

  it("fails closed and names only missing configuration keys", () => {
    expect(() => buildMlWorkerRuntimeConfig({})).toThrowError(MlWorkerConfigurationError);

    try {
      buildMlWorkerRuntimeConfig({});
    } catch (error) {
      expect(error).toMatchObject({
        missingKeys: [
          "DATABASE_URL",
          "SUPABASE_DB_CA_CERT",
          "ACNETREX_ML_API_URL",
          "ACNETREX_ML_SHARED_SECRET",
        ],
      });
      expect(String(error)).not.toContain("postgresql://");
    }
  });

  it("bounds polling, retry, batch, and port configuration", () => {
    expect(buildMlWorkerRuntimeConfig({
      ...requiredEnvironment,
      PORT: "99999",
      ML_WORKER_POLL_INTERVAL_MS: "1",
      ML_WORKER_ERROR_BACKOFF_MS: "999999",
      ML_WORKER_MAX_JOBS: "100",
      ML_WORKER_ID: "railway-worker-01",
    })).toEqual({
      enabled: true,
      port: 65_535,
      pollIntervalMs: 250,
      errorBackoffMs: 60_000,
      maxJobs: 10,
      workerId: "railway-worker-01",
    });
  });

  it("recovers from a failed cycle and becomes ready after a database-backed batch succeeds", async () => {
    const state = createMlWorkerRuntimeState("2026-07-14T00:00:00.000Z");
    const processBatch = vi.fn()
      .mockRejectedValueOnce(new Error("sensitive database detail"))
      .mockResolvedValueOnce([{ status: "idle" }]);
    const sleep = vi.fn().mockResolvedValue(undefined);
    const events: unknown[] = [];

    await runMlWorkerLoop({
      config: buildMlWorkerRuntimeConfig(requiredEnvironment),
      state,
      processBatch,
      sleep,
      maxCycles: 2,
      now: () => "2026-07-14T00:00:01.000Z",
      onEvent: (event) => events.push(event),
    });

    expect(processBatch).toHaveBeenCalledTimes(2);
    expect(processBatch).toHaveBeenCalledWith(expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(sleep).toHaveBeenNthCalledWith(1, 5_000, expect.any(AbortSignal));
    expect(state).toMatchObject({
      ready: true,
      stopping: true,
      lastOutcome: "idle",
      lastErrorCode: null,
      lastCycleAt: "2026-07-14T00:00:01.000Z",
    });
    expect(JSON.stringify(events)).not.toContain("sensitive database detail");
  });

  it("reports process liveness separately from queue readiness", () => {
    const state = createMlWorkerRuntimeState("2026-07-14T00:00:00.000Z");

    expect(mlWorkerHealthResponse("/health/live", state)).toMatchObject({ status: 200 });
    expect(mlWorkerHealthResponse("/health/ready", state)).toMatchObject({ status: 503 });

    state.ready = true;
    state.lastCycleAt = "2026-07-14T00:00:01.000Z";
    state.lastOutcome = "idle";
    expect(mlWorkerHealthResponse("/health/ready", state)).toMatchObject({
      status: 200,
      body: { ok: true, service: "acnetrex-ml-worker", ready: true },
    });
  });

  it("pins the Railway worker to its non-root Docker image and readiness contract", () => {
    const railway = JSON.parse(readFileSync(path.join(process.cwd(), "railway.worker.json"), "utf8"));
    const dockerfile = readFileSync(path.join(process.cwd(), "Dockerfile.worker"), "utf8");

    expect(railway).toMatchObject({
      build: { builder: "DOCKERFILE", dockerfilePath: "Dockerfile.worker" },
      deploy: {
        healthcheckPath: "/health/ready",
        restartPolicyType: "ALWAYS",
        drainingSeconds: 30,
      },
    });
    expect(railway.deploy.restartPolicyMaxRetries).toBeUndefined();
    expect(dockerfile).toContain("FROM oven/bun:1.3.14");
    expect(dockerfile).toContain("USER bun");
    expect(dockerfile).toContain('["bun", "--conditions=react-server", "run", "scripts/ml-worker.ts"]');
  });
});
