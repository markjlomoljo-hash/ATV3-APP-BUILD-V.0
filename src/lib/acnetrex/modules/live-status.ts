import type { ModuleReadiness } from "@/lib/acnetrex/module-result";

/**
 * Live module status derivation.
 *
 * The static registry never claims a service or readiness status — it only
 * declares whether a module has a live probe endpoint (`statusProbe`).
 * Real statuses are derived at runtime from:
 *  - the module's probe response (an owner-scoped GET against its API), and
 *  - the /api/health payload as a fail-closed fallback when the probe has
 *    not produced a response.
 *
 * Modules without a probe stay honestly "not_instrumented" — never a fake
 * ready/blocked value.
 *
 * Readiness rules for a 2xx probe (zero-fabrication):
 *  - a record list came back non-empty  -> "ready" (records were observed)
 *  - a record list came back empty      -> "insufficient_data"
 *  - the body exposes no record list    -> readiness "not_instrumented":
 *    only the service response was observed, so no claim about durable
 *    records is ever made.
 */

export type ModuleProbeOutcome =
  | { kind: "http"; status: number; errorCode?: string | null; emptyHistory?: boolean }
  | { kind: "network_error" };

export type HealthSnapshot = {
  ok: boolean;
  databaseStatus: string;
  cloudRunStatus: string;
};

export type DerivedModuleStatus = {
  serviceStatus: ModuleReadiness;
  readinessStatus: ModuleReadiness;
  source: "probe" | "health" | "not_instrumented";
  detail: string;
};

function both(status: ModuleReadiness, source: DerivedModuleStatus["source"], detail: string): DerivedModuleStatus {
  return { serviceStatus: status, readinessStatus: status, source, detail };
}

function statusFromServiceError(errorCode: string | null | undefined): ModuleReadiness {
  if (!errorCode) return "database_unavailable";
  if (errorCode === "auth_not_configured" || errorCode === "auth_unavailable") return "not_configured";
  if (errorCode === "not_configured") return "not_configured";
  if (errorCode.startsWith("ml_")) return "ml_unavailable";
  return "database_unavailable";
}

export function deriveModuleLiveStatus(input: {
  probePath: string | null;
  probeOutcome?: ModuleProbeOutcome | null;
  health?: HealthSnapshot | null;
}): DerivedModuleStatus {
  const { probePath, probeOutcome, health } = input;

  if (!probePath) {
    return both(
      "not_instrumented",
      "not_instrumented",
      "No live probe is wired for this module yet, so no service status is claimed.",
    );
  }

  if (probeOutcome) {
    if (probeOutcome.kind === "network_error") {
      return both("error_retry_needed", "probe", `The probe request to ${probePath} did not complete.`);
    }

    const { status, errorCode, emptyHistory } = probeOutcome;

    if (status === 401) {
      return both("auth_required", "probe", "The probe requires a signed session before owner data can load.");
    }
    if (status === 403) {
      return both("consent_required", "probe", "The probe was refused pending an explicit consent grant.");
    }
    if (status === 404 || status === 405) {
      return both("not_configured", "probe", `The probe endpoint ${probePath} is not served by this deployment.`);
    }
    if (status >= 500) {
      const mapped = statusFromServiceError(errorCode);
      return both(mapped, "probe", `The service reported ${errorCode ?? `HTTP ${status}`} — nothing was fabricated in its place.`);
    }
    if (status >= 200 && status < 300) {
      if (emptyHistory === true) {
        return {
          serviceStatus: "ready",
          readinessStatus: "insufficient_data",
          source: "probe",
          detail: "The service responded, but this account has no durable records yet.",
        };
      }
      if (emptyHistory === false) {
        return {
          serviceStatus: "ready",
          readinessStatus: "ready",
          source: "probe",
          detail: "The service responded with durable owner-scoped records.",
        };
      }
      // Record-list presence unknown: the probe body exposed no record list,
      // so only the service response is claimed — never durable records.
      return {
        serviceStatus: "ready",
        readinessStatus: "not_instrumented",
        source: "probe",
        detail:
          "The service responded, but this probe does not expose a record list, so no readiness about durable records is claimed.",
      };
    }
    return both("error_retry_needed", "probe", `Unexpected probe response HTTP ${status}.`);
  }

  if (health) {
    if (health.databaseStatus !== "connected") {
      return both(
        "database_unavailable",
        "health",
        `The health endpoint reports database status "${health.databaseStatus}".`,
      );
    }
    return both(
      "not_instrumented",
      "health",
      "Database connectivity is healthy but this module's probe has not run in this session.",
    );
  }

  return both("not_instrumented", "not_instrumented", "No probe response or health snapshot is available yet.");
}

/** Parse an /api/health JSON payload into the snapshot the derivation needs. */
export function parseHealthSnapshot(payload: unknown): HealthSnapshot | null {
  if (typeof payload !== "object" || payload === null) return null;
  const record = payload as Record<string, unknown>;
  const database = typeof record.database === "object" && record.database !== null
    ? (record.database as Record<string, unknown>)
    : null;
  const cloudRun = typeof record.cloudRun === "object" && record.cloudRun !== null
    ? (record.cloudRun as Record<string, unknown>)
    : null;
  return {
    ok: record.ok === true,
    databaseStatus: typeof database?.status === "string" ? database.status : "unknown",
    cloudRunStatus: typeof cloudRun?.status === "string" ? cloudRun.status : "unknown",
  };
}

/** Interpret a probe response body (already parsed JSON) for the derivation. */
export function parseProbeBody(status: number, body: unknown): ModuleProbeOutcome {
  const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : null;
  const errorCode = typeof record?.error === "string" ? record.error : null;

  let emptyHistory: boolean | undefined;
  if (status >= 200 && status < 300 && record) {
    const listKeys = [
      "entries",
      "history",
      "scans",
      "plans",
      "checkins",
      "scenarios",
      "tasks",
      "conversations",
      "reports",
      "exports",
      "sections",
    ];
    for (const key of listKeys) {
      const value = record[key];
      if (Array.isArray(value)) {
        emptyHistory = value.length === 0;
        break;
      }
    }
  }

  return { kind: "http", status, errorCode, emptyHistory };
}
