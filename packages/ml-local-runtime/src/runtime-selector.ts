import type { ConsentContext, RuntimeMode } from "./contracts.js";

export interface RuntimeSelectionInput {
  task: string;
  consent: ConsentContext;
  networkAvailable: boolean;
  deterministicSupported: boolean;
  localModelApproved: boolean;
  localModelCompatible: boolean;
  cloudHealthy: boolean;
  vertexRequired: boolean;
  privacyMode: "local_only" | "cloud_allowed";
}

export interface RuntimeSelection {
  mode: RuntimeMode;
  reason: string;
}

export function selectRuntime(input: RuntimeSelectionInput): RuntimeSelection {
  if (!input.consent.personal_processing) return { mode: "unavailable", reason: "consent_restricted" };
  if (input.deterministicSupported) return { mode: "local_deterministic", reason: "deterministic_engine_supported" };
  if (input.localModelApproved && input.localModelCompatible) {
    return { mode: "local_model", reason: "approved_local_model_available" };
  }
  if (input.privacyMode === "local_only") return { mode: "unavailable", reason: "privacy_mode_disallows_cloud" };
  if (!input.networkAvailable) return { mode: "queued_for_cloud", reason: "network_unavailable" };
  if (!input.cloudHealthy) return { mode: "queued_for_cloud", reason: "cloud_temporarily_unavailable" };
  return { mode: input.vertexRequired ? "cloud_vertex" : "cloud_run", reason: "cloud_runtime_selected" };
}
