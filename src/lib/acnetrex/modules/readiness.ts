import type { AcneTrexModule } from "@/lib/acnetrex/modules/module-registry";
import type { ModuleReadiness } from "@/lib/acnetrex/module-result";

export type ModuleReadinessIssue = {
  status: ModuleReadiness;
  label: string;
  detail: string;
};

export function buildModuleReadinessIssues(module: AcneTrexModule): ModuleReadinessIssue[] {
  const issues: ModuleReadinessIssue[] = [];

  if (module.requiresAuth) {
    issues.push({
      status: "auth_required",
      label: "Account required",
      detail: "This surface must run with a signed user session before it can write or retrieve personal records.",
    });
  }

  if (module.requiresOnboarding) {
    issues.push({
      status: "insufficient_data",
      label: "Baseline required",
      detail: "Onboarding and Skin History records are needed before this module can produce personalized output.",
    });
  }

  if (module.requiresConsentScopes.length > 0) {
    issues.push({
      status: "consent_required",
      label: "Consent scoped",
      detail: `Required consent scope(s): ${module.requiresConsentScopes.join(", ")}.`,
    });
  }

  if (module.dataTables.length > 0) {
    issues.push({
      status: "database_unavailable",
      label: "Persistence target",
      detail: `Expected table contract: ${module.dataTables.join(", ")}.`,
    });
  }

  if (module.storageBuckets.length > 0) {
    issues.push({
      status: "not_configured",
      label: "Private storage",
      detail: `Expected private bucket(s): ${module.storageBuckets.join(", ")}.`,
    });
  }

  if (module.implementedSurfaces.includes("ai_contract")) {
    issues.push({
      status: module.serviceStatus === "queued_for_cloud" ? "queued_for_cloud" : "ml_unavailable",
      label: "AI/ML boundary",
      detail: "This module must use /api/ml/predict or a validated local fallback before showing intelligence.",
    });
  }

  return issues;
}

export function readinessTone(status: ModuleReadiness): "neutral" | "warning" | "ready" | "blocked" {
  if (status === "ready") return "ready";
  if (status === "auth_required" || status === "consent_required") return "warning";
  if (status === "database_unavailable" || status === "ml_unavailable" || status === "error_retry_needed") return "blocked";
  return "neutral";
}
