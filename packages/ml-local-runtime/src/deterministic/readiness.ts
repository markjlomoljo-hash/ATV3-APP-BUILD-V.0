export interface ReadinessInput {
  required: Record<string, unknown>;
  optional?: Record<string, unknown>;
  sampleCount: number;
  minimumSamples: number;
}

export interface ReadinessResult {
  state: "ready" | "partial" | "insufficient_data";
  sampleCount: number;
  minimumSamples: number;
  coverage: number;
  missingRequired: string[];
  missingOptional: string[];
}

function isMissing(value: unknown): boolean {
  return value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
}

export function evaluateReadiness(input: ReadinessInput): ReadinessResult {
  if (!Number.isInteger(input.sampleCount) || input.sampleCount < 0) throw new Error("invalid_sample_count");
  if (!Number.isInteger(input.minimumSamples) || input.minimumSamples < 0) throw new Error("invalid_minimum_samples");
  const requiredEntries = Object.entries(input.required);
  const optionalEntries = Object.entries(input.optional ?? {});
  const missingRequired = requiredEntries.filter(([, value]) => isMissing(value)).map(([key]) => key);
  const missingOptional = optionalEntries.filter(([, value]) => isMissing(value)).map(([key]) => key);
  const total = requiredEntries.length + optionalEntries.length;
  const present = total - missingRequired.length - missingOptional.length;
  const enoughSamples = input.sampleCount >= input.minimumSamples;
  const state = missingRequired.length > 0 || !enoughSamples
    ? "insufficient_data"
    : missingOptional.length > 0
      ? "partial"
      : "ready";

  return {
    state,
    sampleCount: input.sampleCount,
    minimumSamples: input.minimumSamples,
    coverage: total === 0 ? 1 : present / total,
    missingRequired,
    missingOptional,
  };
}
