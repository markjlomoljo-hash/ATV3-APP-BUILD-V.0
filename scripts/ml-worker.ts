import { createServer } from "node:http";

import { getPool } from "@/db";
import { processMlAnalysisBatch } from "@/lib/acnetrex/ml-analysis-worker";
import {
  MlWorkerConfigurationError,
  buildMlWorkerRuntimeConfig,
  createMlWorkerRuntimeState,
  mlWorkerHealthResponse,
  runMlWorkerLoop,
} from "@/lib/acnetrex/ml-worker-runtime";

function loadConfiguration() {
  try {
    return buildMlWorkerRuntimeConfig(process.env);
  } catch (error) {
    const missingKeys = error instanceof MlWorkerConfigurationError ? error.missingKeys : [];
    console.error(JSON.stringify({ level: "error", code: "worker_configuration_invalid", missingKeys }));
    process.exit(1);
  }
}

const config = loadConfiguration();
const state = createMlWorkerRuntimeState();
const abortController = new AbortController();

const server = createServer((request, response) => {
  const pathname = new URL(request.url ?? "/", "http://worker.local").pathname;
  const health = mlWorkerHealthResponse(pathname, state);
  response.writeHead(health.status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(health.body));
});

let shutdownRequested = false;
function requestShutdown() {
  if (shutdownRequested) return;
  shutdownRequested = true;
  state.stopping = true;
  abortController.abort();
}

process.once("SIGTERM", requestShutdown);
process.once("SIGINT", requestShutdown);

await new Promise<void>((resolve, reject) => {
  server.once("error", reject);
  server.listen(config.port, "0.0.0.0", () => resolve());
});

console.log(JSON.stringify({ level: "info", code: "worker_started", port: config.port }));

try {
  await runMlWorkerLoop({
    config,
    state,
    processBatch: processMlAnalysisBatch,
    signal: abortController.signal,
    onEvent: (event) => console.log(JSON.stringify(event)),
  });
} finally {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await getPool().end().catch(() => {
    console.error(JSON.stringify({ level: "error", code: "worker_database_shutdown_failed" }));
  });
}
