import { describe, expect, it } from "vitest";
import { deriveModuleLiveStatus, parseHealthSnapshot, parseProbeBody } from "./live-status";

describe("deriveModuleLiveStatus", () => {
  it("keeps modules without a probe explicitly not instrumented", () => {
    const derived = deriveModuleLiveStatus({ probePath: null, health: { ok: true, databaseStatus: "connected", cloudRunStatus: "healthy" } });
    expect(derived).toMatchObject({
      serviceStatus: "not_instrumented",
      readinessStatus: "not_instrumented",
      source: "not_instrumented",
    });
  });

  it("maps 401 probes to auth_required", () => {
    const derived = deriveModuleLiveStatus({
      probePath: "/api/logs/sleep",
      probeOutcome: { kind: "http", status: 401, errorCode: "auth_required" },
    });
    expect(derived).toMatchObject({ serviceStatus: "auth_required", readinessStatus: "auth_required", source: "probe" });
  });

  it("maps 403 probes to consent_required", () => {
    const derived = deriveModuleLiveStatus({
      probePath: "/api/faceatlas/scans",
      probeOutcome: { kind: "http", status: 403, errorCode: "consent_required" },
    });
    expect(derived.serviceStatus).toBe("consent_required");
  });

  it("maps service errors to typed unavailable states", () => {
    expect(
      deriveModuleLiveStatus({
        probePath: "/api/logs/sleep",
        probeOutcome: { kind: "http", status: 503, errorCode: "database_connection_refused" },
      }).serviceStatus,
    ).toBe("database_unavailable");

    expect(
      deriveModuleLiveStatus({
        probePath: "/api/logs/sleep",
        probeOutcome: { kind: "http", status: 503, errorCode: "auth_not_configured" },
      }).serviceStatus,
    ).toBe("not_configured");

    expect(
      deriveModuleLiveStatus({
        probePath: "/api/ml/predict",
        probeOutcome: { kind: "http", status: 503, errorCode: "ml_unavailable" },
      }).serviceStatus,
    ).toBe("ml_unavailable");
  });

  it("treats an unserved probe endpoint as not configured", () => {
    expect(
      deriveModuleLiveStatus({ probePath: "/api/gone", probeOutcome: { kind: "http", status: 404 } }).serviceStatus,
    ).toBe("not_configured");
  });

  it("reports a working service with no records as insufficient_data, never ready", () => {
    const derived = deriveModuleLiveStatus({
      probePath: "/api/logs/sleep",
      probeOutcome: { kind: "http", status: 200, emptyHistory: true },
    });
    expect(derived).toMatchObject({ serviceStatus: "ready", readinessStatus: "insufficient_data", source: "probe" });
  });

  it("reports ready only when durable records actually came back", () => {
    const derived = deriveModuleLiveStatus({
      probePath: "/api/logs/sleep",
      probeOutcome: { kind: "http", status: 200, emptyHistory: false },
    });
    expect(derived).toMatchObject({ serviceStatus: "ready", readinessStatus: "ready" });
  });

  it("never claims durable records when the probe body exposed no record list", () => {
    const derived = deriveModuleLiveStatus({
      probePath: "/api/profile/professional",
      probeOutcome: { kind: "http", status: 200, emptyHistory: undefined },
    });
    expect(derived).toMatchObject({
      serviceStatus: "ready",
      readinessStatus: "not_instrumented",
      source: "probe",
    });
    expect(derived.readinessStatus).not.toBe("ready");
    expect(derived.detail).not.toMatch(/durable owner-scoped records/i);
    expect(derived.detail).toMatch(/no readiness about durable records is claimed/i);
  });

  it("stays neutral for singleton and health-shaped 2xx probe bodies end to end", () => {
    // /api/profile/professional -> { ok, profile }, /api/profile/consent -> { ok, consent },
    // /api/gamification -> { ok, gamification }, /api/health -> health payload:
    // none expose a record list, so readiness must never derive "ready".
    const bodies: unknown[] = [
      { ok: true, profile: { displayName: "a" } },
      { ok: true, consent: null },
      { ok: true, gamification: { level: 1 } },
      { ok: true, database: { status: "connected" }, cloudRun: { status: "healthy" } },
      null,
    ];
    for (const body of bodies) {
      const derived = deriveModuleLiveStatus({
        probePath: "/api/some-probe",
        probeOutcome: parseProbeBody(200, body),
      });
      expect(derived.readinessStatus).toBe("not_instrumented");
      expect(derived.detail).not.toMatch(/durable owner-scoped records/i);
    }
  });

  it("marks failed probe transports as retry needed", () => {
    expect(
      deriveModuleLiveStatus({ probePath: "/api/logs/sleep", probeOutcome: { kind: "network_error" } }).serviceStatus,
    ).toBe("error_retry_needed");
  });

  it("falls back to the health snapshot when the probe has not run", () => {
    expect(
      deriveModuleLiveStatus({
        probePath: "/api/logs/sleep",
        health: { ok: false, databaseStatus: "unavailable", cloudRunStatus: "offline" },
      }),
    ).toMatchObject({ serviceStatus: "database_unavailable", source: "health" });

    expect(
      deriveModuleLiveStatus({
        probePath: "/api/logs/sleep",
        health: { ok: true, databaseStatus: "connected", cloudRunStatus: "healthy" },
      }),
    ).toMatchObject({ serviceStatus: "not_instrumented", source: "health" });
  });
});

describe("parseHealthSnapshot", () => {
  it("extracts database and cloud run statuses", () => {
    expect(
      parseHealthSnapshot({ ok: false, database: { status: "unavailable" }, cloudRun: { status: "offline" } }),
    ).toEqual({ ok: false, databaseStatus: "unavailable", cloudRunStatus: "offline" });
  });

  it("returns null for non-object payloads and unknown for missing fields", () => {
    expect(parseHealthSnapshot(null)).toBeNull();
    expect(parseHealthSnapshot("<html>")).toBeNull();
    expect(parseHealthSnapshot({})).toEqual({ ok: false, databaseStatus: "unknown", cloudRunStatus: "unknown" });
  });
});

describe("parseProbeBody", () => {
  it("detects empty history from list payloads", () => {
    expect(parseProbeBody(200, { ok: true, entries: [] })).toEqual({
      kind: "http",
      status: 200,
      errorCode: null,
      emptyHistory: true,
    });
    expect(parseProbeBody(200, { ok: true, scans: [{ id: "a" }] })).toMatchObject({ emptyHistory: false });
  });

  it("recognizes the { ok, history } shape used by /api/reports/history and /api/exports/history", () => {
    expect(parseProbeBody(200, { ok: true, history: [] })).toMatchObject({ emptyHistory: true });
    expect(parseProbeBody(200, { ok: true, history: [{ id: "r1" }] })).toMatchObject({ emptyHistory: false });
  });

  it("derives insufficient_data, not ready, for an empty reports history", () => {
    const derived = deriveModuleLiveStatus({
      probePath: "/api/reports/history",
      probeOutcome: parseProbeBody(200, { ok: true, history: [] }),
    });
    expect(derived).toMatchObject({ serviceStatus: "ready", readinessStatus: "insufficient_data" });
  });

  it("keeps error codes from failed responses", () => {
    expect(parseProbeBody(503, { ok: false, error: "database_unavailable" })).toEqual({
      kind: "http",
      status: 503,
      errorCode: "database_unavailable",
      emptyHistory: undefined,
    });
  });

  it("leaves emptyHistory undefined when no list key is present", () => {
    expect(parseProbeBody(200, { ok: true })).toMatchObject({ emptyHistory: undefined });
  });
});
