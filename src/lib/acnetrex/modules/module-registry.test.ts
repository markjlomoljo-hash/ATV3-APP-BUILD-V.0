import { describe, expect, it } from "vitest";
import { ACNETREX_MODULES, completionSnapshot, getModuleByPath } from "./module-registry";

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
      expect(["ready", "insufficient_data", "not_configured", "auth_required", "consent_required", "database_unavailable", "ml_unavailable", "evidence_unavailable", "queued_for_cloud", "error_retry_needed"]).toContain(moduleConfig.readinessStatus);
      expect(moduleConfig.nextAction.length, moduleConfig.id).toBeGreaterThan(10);
    }
  });

  it("summarizes app-body coverage without treating live infrastructure as complete", () => {
    const snapshot = completionSnapshot();
    expect(snapshot.total).toBeGreaterThanOrEqual(requiredRoutes.length);
    expect(snapshot.routed).toBe(snapshot.total);
    expect(snapshot.blockedByLiveInfrastructure).toBeGreaterThan(0);
  });
});
