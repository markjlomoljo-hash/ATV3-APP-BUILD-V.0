import { apiFetch, apiMutation, createMutationOperation } from "./api";

export type PrivacyConsentSettings = {
  personalLearning: boolean;
  anonymousLearning: boolean;
  rawImageStorage: boolean;
  notificationsEnabled: boolean;
  cycleContext: boolean;
  exportEnabled: boolean;
};

export async function fetchPrivacyConsents(): Promise<PrivacyConsentSettings> {
  const response = await apiFetch<{ ok: true } & PrivacyConsentSettings>(
    "/api/privacy/consent",
  );
  const { ok: _ok, ...settings } = response;
  return settings;
}

export async function updatePrivacyConsent(
  key: keyof PrivacyConsentSettings,
  value: boolean,
): Promise<void> {
  await apiMutation<{ ok: true }, Partial<PrivacyConsentSettings>>(
    "PATCH",
    "/api/privacy/consent",
    createMutationOperation({ [key]: value }),
  );
}

export type PrivacyExportResponse = {
  ok: true;
  exportRequestId: string;
  status: "pending" | "processing";
  message: string;
};

export function requestPrivacyExport(): Promise<PrivacyExportResponse> {
  return apiMutation<PrivacyExportResponse, Record<string, never>>(
    "POST",
    "/api/privacy/export",
    createMutationOperation({}),
  );
}

export type PrivacyDeletionResponse = {
  ok: true;
  deletionRequestId: string;
  status: "pending" | "processing";
  message: string;
};

export function requestPrivacyDeletion(): Promise<PrivacyDeletionResponse> {
  return apiMutation<PrivacyDeletionResponse, { confirmation: "DELETE" }>(
    "POST",
    "/api/privacy/delete-account",
    createMutationOperation({ confirmation: "DELETE" }),
  );
}
