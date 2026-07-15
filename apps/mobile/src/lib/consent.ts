import { apiFetch, apiMutation, createMutationOperation } from "./api";

export type CanonicalConsent = Readonly<{
  personalProcessing: boolean;
  rawImageProcessing: boolean;
  personalLearning: boolean;
  rawImageRetention: boolean;
  anonymousLearning: boolean;
  researchShare: boolean;
  marketing: boolean;
  consentedAt: string | null;
  updatedAt: string | null;
}>;

export async function getCanonicalConsent() {
  return apiFetch<{ ok: true; consent: CanonicalConsent }>("/api/consents");
}

export async function updateCanonicalConsent(patch: Partial<Pick<CanonicalConsent,
  "personalProcessing" | "rawImageProcessing" | "personalLearning" | "rawImageRetention" |
  "anonymousLearning" | "researchShare" | "marketing">>) {
  return apiMutation<{ ok: true; consent: CanonicalConsent; replayed: boolean }, typeof patch>(
    "PATCH",
    "/api/consents",
    createMutationOperation(patch),
  );
}
