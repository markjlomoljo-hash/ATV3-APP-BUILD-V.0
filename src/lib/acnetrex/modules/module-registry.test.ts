import { describe, expect, it } from "vitest";
import {
  ACNETREX_MODULES,
  MODULE_STATUS_PROBES,
  completionSnapshot,
  getModuleByPath,
  moduleStatusProbe,
} from "./module-registry";

const requiredRoutes = [
  "/auth",
  "/onboarding",
  "/profile",
  "/settings",
  "/privacy",
  "/readiness",
  "/log/sleep",
  "/log/food",
  "/log/stress",
  "/log/activity",
  "/log/hydration",
  "/log/cycle",
  "/log/contact",
  "/log/routine",
  "/log/treatment",
  "/log/skin-state",
  "/face-atlas",
  "/face-atlas/capture",
  "/face-atlas/annotations",
  "/face-atlas/history",
  "/skin-twin",
  "/skin-twin/scenarios",
  "/skin-twin/history",
  "/ai",
  "/cutisai",
  "/intelligence",
  "/triggers",
  "/forecast",
  "/barrier",
  "/products",
  "/formula-lens",
  "/climate",
  "/reports",
  "/reports/history",
  "/reports/export",
  "/export",
  "/delete-account",
  "/treatments",
  "/treatments/checkins",
  "/tasks",
  "/gamification",
  "/research",
  "/oauth/consent",
];

describe("AcneTrex PRD module registry", () => {
  it("maps all required PRD routes to module contracts", () => {
    for (const route of requiredRoutes) {
      expect(getModuleByPath(route), route).toBeDefined();
    }
  });

  it("keeps every module honest with readiness and missing-surface language", () => {
    for (const moduleConfig of ACNETREX_MODULES) {
      expect(moduleConfig.implementedSurfaces).toContain("route");
      expect(moduleConfig.missingSurfaces.length, moduleConfig.id).toBeGreaterThan(0);
      expect(moduleConfig.nextAction.length, moduleConfig.id).toBeGreaterThan(10);
    }
  });

  it("never hardcodes a live status — the static registry stays not_instrumented", () => {
    for (const moduleConfig of ACNETREX_MODULES) {
      expect(moduleConfig.serviceStatus, moduleConfig.id).toBe("not_instrumented");
      expect(moduleConfig.readinessStatus, moduleConfig.id).toBe("not_instrumented");
    }
  });

  it("declares live probes only for modules and endpoints that exist", () => {
    const moduleIds = new Set(ACNETREX_MODULES.map((module) => module.id));
    for (const [moduleId, probe] of Object.entries(MODULE_STATUS_PROBES)) {
      expect(moduleIds.has(moduleId), moduleId).toBe(true);
      expect(probe, moduleId).toMatch(/^\/api\//);
    }
  });

  it("only declares probes that succeed as bare GETs — never query-param-required endpoints", () => {
    // ModuleLiveStatusPanel fetches each probe path with no query params.
    // Endpoints whose GET rejects a bare request (HTTP 400) would render a
    // permanent, unwinnable error_retry_needed status, so they must never be
    // used as probes. /api/faceatlas/annotations requires a scanId UUID
    // (src/app/api/faceatlas/annotations/route.ts returns invalid_scan_id 400
    // without one).
    const bareGetIncompatibleEndpoints = ["/api/faceatlas/annotations"];
    for (const [moduleId, probe] of Object.entries(MODULE_STATUS_PROBES)) {
      expect(bareGetIncompatibleEndpoints, moduleId).not.toContain(probe);
      expect(probe, moduleId).not.toContain("?");
    }
  });

  it("probes face-atlas-annotations through the bare-GET scans endpoint its flow depends on", () => {
    // Annotations require an existing scan, and the scans GET is the
    // owner-scoped list endpoint the rest of the FaceAtlas family probes.
    expect(moduleStatusProbe("face-atlas-annotations")).toBe("/api/faceatlas/scans");
    expect(moduleStatusProbe("face-atlas-history")).toBe("/api/faceatlas/scans");
    expect(moduleStatusProbe("face-atlas-capture")).toBe("/api/faceatlas/scans");
    expect(moduleStatusProbe("face-atlas")).toBe("/api/faceatlas/scans");
  });

  it("instruments the full daily-log family with canonical log probes", () => {
    const dailyLogModules: Array<[string, string]> = [
      ["sleepderm", "/api/logs/sleep"],
      ["dermdiet", "/api/logs/food"],
      ["stress", "/api/logs/stress"],
      ["activity", "/api/logs/activity"],
      ["hydration", "/api/logs/hydration"],
      ["cycle", "/api/logs/cycle"],
      ["contact", "/api/logs/contact"],
      ["routine", "/api/logs/routine"],
      ["skin-state", "/api/logs/skin-state"],
    ];
    for (const [moduleId, probe] of dailyLogModules) {
      expect(moduleStatusProbe(moduleId), moduleId).toBe(probe);
    }
    expect(moduleStatusProbe("native-mobile")).toBeNull();
  });

  it("summarizes coverage with honest instrumentation counts", () => {
    const snapshot = completionSnapshot();
    expect(snapshot.total).toBeGreaterThanOrEqual(requiredRoutes.length);
    expect(snapshot.routed).toBe(snapshot.total);
    expect(snapshot.instrumented).toBeGreaterThan(0);
    expect(snapshot.notInstrumented).toBeGreaterThan(0);
    expect(snapshot.instrumented + snapshot.notInstrumented).toBe(snapshot.total);
  });
});
