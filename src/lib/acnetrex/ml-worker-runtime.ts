export type MlWorkerRuntimeConfig = {
  port: number;
  pollIntervalMs: number;
  errorBackoffMs: number;
  maxJobs: number;
  workerId: string;
};

export type MlWorkerRuntimeState = {
  service: "acnetrex-ml-worker";
  startedAt: string;
  ready: boolean;
  stopping: boolean;
  lastCycleAt: string | null;
  lastOutcome: string;
  lastErrorCode: string | null;
};

type MlWorkerOutcome = { status: string };

type ProcessBatch = (options: {
  maxJobs: number;
  workerId: string;
}) => Promise<readonly MlWorkerOutcome[]>;

type RuntimeEvent =
  | { level: "info"; code: "worker_cycle_completed"; outcome: string }
  | { level: "error"; code: "worker_cycle_failed" }
  | { level: "info"; code: "worker_stopped" };

type WorkerLoopOptions = {
  config: MlWorkerRuntimeConfig;
  state: MlWorkerRuntimeState;
  processBatch: ProcessBatch;
  signal?: AbortSignal;
  sleep?: (milliseconds: number, signal: AbortSignal) => Promise<void>;
  now?: () => string;
  onEvent?: (event: RuntimeEvent) => void;
  maxCycles?: number;
};

const requiredEnvironmentKeys = [
  "DATABASE_URL",
  "SUPABASE_DB_CA_CERT",
  "ACNETREX_ML_API_URL",
  "ACNETREX_ML_SHARED_SECRET",
] as const;

export class MlWorkerConfigurationError extends Error {
  readonly missingKeys: string[];

  constructor(missingKeys: string[]) {
    super(`Missing required ML worker configuration: ${missingKeys.join(", ")}`);
    this.name = "MlWorkerConfigurationError";
    this.missingKeys = missingKeys;
  }
}

function boundedInteger(value: string | undefined, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.trunc(parsed)));
}

function safeWorkerId(value: string | undefined): string {
  const candidate = value?.trim();
  return candidate && /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/.test(candidate)
    ? candidate
    : "railway-ml-worker";
}

export function buildMlWorkerRuntimeConfig(
  environment: Record<string, string | undefined>,
): MlWorkerRuntimeConfig {
  const missingKeys = requiredEnvironmentKeys.filter((key) => !environment[key]?.trim());
  if (missingKeys.length > 0) throw new MlWorkerConfigurationError([...missingKeys]);

  return {
    port: boundedInteger(environment.PORT, 8080, 1, 65_535),
    pollIntervalMs: boundedInteger(environment.ML_WORKER_POLL_INTERVAL_MS, 1_000, 250, 30_000),
    errorBackoffMs: boundedInteger(environment.ML_WORKER_ERROR_BACKOFF_MS, 5_000, 1_000, 60_000),
    maxJobs: boundedInteger(environment.ML_WORKER_MAX_JOBS, 5, 1, 10),
    workerId: safeWorkerId(environment.ML_WORKER_ID),
  };
}

export function createMlWorkerRuntimeState(startedAt = new Date().toISOString()): MlWorkerRuntimeState {
  return {
    service: "acnetrex-ml-worker",
    startedAt,
    ready: false,
    stopping: false,
    lastCycleAt: null,
    lastOutcome: "starting",
    lastErrorCode: null,
  };
}

export function mlWorkerHealthResponse(pathname: string, state: MlWorkerRuntimeState) {
  if (pathname === "/health/live") {
    return {
      status: 200,
      body: { ok: true, service: state.service, live: true },
    };
  }

  if (pathname === "/health/ready") {
    const ready = state.ready && !state.stopping;
    return {
      status: ready ? 200 : 503,
      body: {
        ok: ready,
        service: state.service,
        ready,
        lastCycleAt: state.lastCycleAt,
        lastOutcome: state.lastOutcome,
        lastErrorCode: state.lastErrorCode,
      },
    };
  }

  return { status: 404, body: { ok: false, service: state.service, error: "not_found" } };
}

async function abortableSleep(milliseconds: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return;
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(finish, milliseconds);
    function finish() {
      clearTimeout(timeout);
      signal.removeEventListener("abort", finish);
      resolve();
    }
    signal.addEventListener("abort", finish, { once: true });
  });
}

export async function runMlWorkerLoop(options: WorkerLoopOptions): Promise<void> {
  const controller = options.signal ? null : new AbortController();
  const signal = options.signal ?? controller!.signal;
  const sleep = options.sleep ?? abortableSleep;
  const now = options.now ?? (() => new Date().toISOString());
  const onEvent = options.onEvent ?? (() => undefined);
  const maxCycles = options.maxCycles ?? Number.POSITIVE_INFINITY;
  let cycles = 0;

  try {
    while (!signal.aborted && cycles < maxCycles) {
      cycles += 1;
      try {
        const outcomes = await options.processBatch({
          maxJobs: options.config.maxJobs,
          workerId: options.config.workerId,
        });
        const outcome = outcomes.at(-1)?.status ?? "idle";
        options.state.ready = true;
        options.state.lastCycleAt = now();
        options.state.lastOutcome = outcome;
        options.state.lastErrorCode = null;
        onEvent({ level: "info", code: "worker_cycle_completed", outcome });
        if (!signal.aborted && cycles < maxCycles) await sleep(options.config.pollIntervalMs, signal);
      } catch {
        options.state.ready = false;
        options.state.lastCycleAt = now();
        options.state.lastOutcome = "error";
        options.state.lastErrorCode = "worker_cycle_failed";
        onEvent({ level: "error", code: "worker_cycle_failed" });
        if (!signal.aborted && cycles < maxCycles) await sleep(options.config.errorBackoffMs, signal);
      }
    }
  } finally {
    options.state.stopping = true;
    onEvent({ level: "info", code: "worker_stopped" });
  }
}
