/**
 * FaceAtlas history presentation logic (pure).
 *
 * Extracted from the FaceAtlas screen so the timeline merge and the badge
 * mappings are unit-testable. Nothing here invents data: entries are the
 * server rows verbatim, ordered into one dated timeline, and badge colors
 * come from explicit vocabulary maps — an unknown value renders as neutral,
 * never as success.
 */

import type {
  FaceAtlasScanSummary,
  FaceScanRecord,
} from "./faceatlas-service";

// ─── Unified timeline ─────────────────────────────────────────────────────────

export type ScanTimelineEntry =
  | { kind: "capture"; sortDate: string; scan: FaceScanRecord }
  | { kind: "summary"; sortDate: string; scan: FaceAtlasScanSummary };

/**
 * Merges the two scan tables into one timeline ordered newest-first.
 * `face_scans` rows sort by `captured_at`; `face_atlas_scans` summaries sort
 * by `scan_date`. Ties keep captures (the raw record) before summaries.
 */
export function mergeScanTimeline(
  captures: FaceScanRecord[],
  summaries: FaceAtlasScanSummary[]
): ScanTimelineEntry[] {
  const entries: ScanTimelineEntry[] = [
    ...captures.map((scan) => ({
      kind: "capture" as const,
      sortDate: scan.captured_at,
      scan,
    })),
    ...summaries.map((scan) => ({
      kind: "summary" as const,
      sortDate: scan.scan_date,
      scan,
    })),
  ];
  return entries.sort((a, b) => {
    const byDate = b.sortDate.localeCompare(a.sortDate);
    if (byDate !== 0) return byDate;
    if (a.kind === b.kind) return 0;
    return a.kind === "capture" ? -1 : 1;
  });
}

// ─── Badge vocabulary maps ────────────────────────────────────────────────────

export interface BadgeColors {
  color: string;
  textColor: string;
}

// Theme-aligned literals (Colors.primaryLight/primary for success). Kept as
// plain strings here so this module stays free of react-native imports.
const GREEN: BadgeColors = { color: "#d1fae5", textColor: "#047857" };
const AMBER: BadgeColors = { color: "#fef3c7", textColor: "#92400e" };
const NEUTRAL: BadgeColors = { color: "#f1f5f9", textColor: "#475569" };

/**
 * Confidence vocabulary from the web schema
 * (src/lib/acnetrex/modules/schemas.ts confidenceSchema). Only
 * `high_confidence` earns green. Any value outside the documented vocabulary
 * renders neutral — never green: an unknown confidence is not a success
 * state.
 */
const CONFIDENCE_BADGES: Record<string, BadgeColors> = {
  insufficient_data: NEUTRAL,
  early_hypothesis: AMBER,
  moderate_confidence: AMBER,
  high_confidence: GREEN,
};

export function confidenceBadge(confidence: string): BadgeColors {
  return CONFIDENCE_BADGES[confidence] ?? NEUTRAL;
}

/**
 * Status vocabulary for `face_scans.status`. The backend contract creates
 * rows as `pending_upload`; `complete` is the only success state. Unknown
 * statuses render neutral.
 */
const STATUS_BADGES: Record<string, BadgeColors> = {
  complete: GREEN,
  pending_upload: AMBER,
  pending: AMBER,
  processing: AMBER,
  failed: { color: "#fee2e2", textColor: "#dc2626" },
};

export function statusBadge(status: string): BadgeColors {
  return STATUS_BADGES[status] ?? NEUTRAL;
}
