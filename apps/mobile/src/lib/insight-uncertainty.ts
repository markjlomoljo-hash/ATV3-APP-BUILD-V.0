/**
 * Insight uncertainty markers (pure).
 *
 * Builds the InsightWithUncertainty / UncertaintyMarker contracts from real
 * data coverage, replacing static caveat sentences. Every field follows a
 * documented deterministic rule over persisted counts — nothing here scores,
 * estimates, or infers:
 *
 * - basis is always "measured": insight values are arithmetic over logs the
 *   user actually saved (averages, ratios). Nothing is estimated or
 *   inferred, so the other basis values are never claimed.
 * - isReliable = dataPointCount >= minDataPointsRequired (the same threshold
 *   the screen already uses to decide whether to render the insight).
 * - confidence is a coverage statement, not a model score:
 *     low    → below the minimum (insight should not be rendered as reliable)
 *     medium → at/above the minimum
 *     high   → at/above the minimum AND data on >= 80% of window days
 * - caveat states the real coverage so the user sees exactly how much data
 *   the insight rests on.
 */

import type { InsightWithUncertainty, UncertaintyMarker } from "./contracts";

export const HIGH_CONFIDENCE_COVERAGE = 0.8;

export interface UncertaintyInput {
  /** Real number of persisted data points inside the window. */
  dataPointCount: number;
  /** Minimum points before the insight counts as reliable. */
  minDataPointsRequired: number;
  /** Calendar days the insight window spans (coverage denominator). */
  windowDays: number;
  /** Short label for the data points, e.g. "sleep logs", "check-ins". */
  dataPointLabel: string;
}

export function buildUncertaintyMarker(input: UncertaintyInput): UncertaintyMarker {
  const coverage =
    input.windowDays > 0 ? input.dataPointCount / input.windowDays : 0;
  const reliable = input.dataPointCount >= input.minDataPointsRequired;
  const confidence: UncertaintyMarker["confidence"] = !reliable
    ? "low"
    : coverage >= HIGH_CONFIDENCE_COVERAGE
      ? "high"
      : "medium";

  const caveat = reliable
    ? `Based on ${input.dataPointCount} ${input.dataPointLabel} across a ${input.windowDays}-day window (${Math.round(coverage * 100)}% of days). An observational pattern from your data, not a medical conclusion.`
    : `Only ${input.dataPointCount} of the ${input.minDataPointsRequired} ${input.dataPointLabel} needed for a reliable pattern exist in this ${input.windowDays}-day window.`;

  return { confidence, basis: "measured", caveat };
}

export function buildInsightWithUncertainty<T>(
  data: T,
  input: UncertaintyInput
): InsightWithUncertainty<T> {
  return {
    data,
    uncertainty: buildUncertaintyMarker(input),
    dataPointCount: input.dataPointCount,
    minDataPointsRequired: input.minDataPointsRequired,
    isReliable: input.dataPointCount >= input.minDataPointsRequired,
  };
}
