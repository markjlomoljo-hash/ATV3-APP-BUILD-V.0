export type FaceAtlasScan = {
  id: string;
  angle: string;
  status: string;
  capturedAt: string;
  storagePath: string | null;
  rawImageDeletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FaceAtlasAnnotation = {
  id: string;
  scanId: string;
  lesionType: string;
  zone: string | null;
  x: number | null;
  y: number | null;
  w: number | null;
  h: number | null;
  userCertainty: number | null;
  source: "user" | "model";
  notes: string | null;
  createdAt: string;
};

export type FaceAtlasScanDetail = {
  scan: FaceAtlasScan;
  annotations: FaceAtlasAnnotation[];
};

export type ObservedMarker = {
  id: string;
  zone: string | null;
  lesionType: string;
  x: number;
  y: number;
  w: number | null;
  h: number | null;
  source: "user" | "model";
  certainty: number | null;
};

export type ObservedSkinViewModel = {
  status: "ready" | "insufficient_data";
  label: "Observed current state";
  visualMode: "authorized_raw_image" | "derived_neutral_model";
  rawImageUri: string | null;
  scanId: string | null;
  scanTime: string | null;
  angle: string | null;
  markers: ObservedMarker[];
  zoneCounts: Array<{ zone: string; count: number }>;
  inflammatoryCount: number;
  nonInflammatoryCount: number;
  uncertainCount: number;
  sourceSummary: string;
  qualityWarning: string | null;
  limitation: string;
};

export type SkinTwinProjectionInput = {
  status: string;
  window: string;
  confidence: string | null;
  simulation: unknown;
  uncertainty: unknown;
  sourceRecordRefs: unknown[];
};

export type SkinTwinProjectionViewModel = {
  status: "ready" | "insufficient_data";
  label: "Estimated scenario projection";
  window: string;
  direction: string | null;
  uncertainty: string | null;
  confidence: string;
  dataSufficiency: string;
  zoneDirections: Array<{ zone: string; direction: string }>;
  projectedMarkers: never[];
  granularity: "abstract_zone";
  explanation: string;
  disclaimer: "Estimated from persisted inputs; not a guaranteed outcome.";
};

const INFLAMMATORY = new Set(["papule", "pustule", "nodule", "cyst"]);
const NON_INFLAMMATORY = new Set(["comedone_open", "comedone_closed"]);
const COMPLETED_SCAN_STATUSES = new Set(["complete", "completed", "analyzed"]);
const SUFFICIENT_CONFIDENCE = new Set(["moderate_confidence", "high_confidence"]);

function objectRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function latestCompletedScan(scans: FaceAtlasScan[]): FaceAtlasScan | null {
  return scans.find((scan) => COMPLETED_SCAN_STATUSES.has(scan.status)) ?? null;
}

export function buildObservedSkinViewModel(
  detail: FaceAtlasScanDetail | null,
  authorizedRawImageUri: string | null = null,
): ObservedSkinViewModel {
  if (!detail || !COMPLETED_SCAN_STATUSES.has(detail.scan.status)) {
    return {
      status: "insufficient_data",
      label: "Observed current state",
      visualMode: "derived_neutral_model",
      rawImageUri: null,
      scanId: null,
      scanTime: null,
      angle: null,
      markers: [],
      zoneCounts: [],
      inflammatoryCount: 0,
      nonInflammatoryCount: 0,
      uncertainCount: 0,
      sourceSummary: "No completed FaceAtlas scan",
      qualityWarning: null,
      limitation: "A completed FaceAtlas scan is required. No markers are inferred from missing data.",
    };
  }

  const canUseRawImage = Boolean(authorizedRawImageUri) && detail.scan.rawImageDeletedAt === null;
  const markers = detail.annotations.flatMap((annotation): ObservedMarker[] => {
    if (annotation.x === null || annotation.y === null) return [];
    return [{
      id: annotation.id,
      zone: annotation.zone,
      lesionType: annotation.lesionType,
      x: annotation.x,
      y: annotation.y,
      w: annotation.w,
      h: annotation.h,
      source: annotation.source,
      certainty: annotation.userCertainty,
    }];
  });
  const zoneMap = new Map<string, number>();
  for (const marker of markers) {
    const zone = marker.zone ?? "unassigned";
    zoneMap.set(zone, (zoneMap.get(zone) ?? 0) + 1);
  }
  const lowCertaintyCount = markers.filter(
    (marker) => marker.certainty === null || marker.certainty < 0.6,
  ).length;
  const userCount = markers.filter((marker) => marker.source === "user").length;
  const modelCount = markers.filter((marker) => marker.source === "model").length;

  return {
    status: "ready",
    label: "Observed current state",
    visualMode: canUseRawImage ? "authorized_raw_image" : "derived_neutral_model",
    rawImageUri: canUseRawImage ? authorizedRawImageUri : null,
    scanId: detail.scan.id,
    scanTime: detail.scan.capturedAt,
    angle: detail.scan.angle,
    markers,
    zoneCounts: [...zoneMap.entries()]
      .map(([zone, count]) => ({ zone, count }))
      .sort((left, right) => right.count - left.count || left.zone.localeCompare(right.zone)),
    inflammatoryCount: markers.filter((marker) => INFLAMMATORY.has(marker.lesionType)).length,
    nonInflammatoryCount: markers.filter((marker) => NON_INFLAMMATORY.has(marker.lesionType)).length,
    uncertainCount: markers.filter((marker) => marker.lesionType === "uncertain").length,
    sourceSummary: `User markers: ${userCount}; model markers: ${modelCount}; agreement is not calculated`,
    qualityWarning: lowCertaintyCount > 0
      ? `${lowCertaintyCount} marker${lowCertaintyCount === 1 ? "" : "s"} have low or unrecorded certainty`
      : null,
    limitation: canUseRawImage
      ? "Markers are persisted observations; they are not a diagnosis."
      : "Neutral derived model shown because no authorized retained-image URI is available. Markers are persisted observations, not inferred pixels.",
  };
}

export function buildSkinTwinProjectionViewModel(
  scenario: SkinTwinProjectionInput,
): SkinTwinProjectionViewModel {
  const simulation = objectRecord(scenario.simulation);
  const uncertaintyRecord = objectRecord(scenario.uncertainty);
  const direction = stringValue(simulation?.direction ?? simulation?.projected_direction);
  const uncertainty = stringValue(
    uncertaintyRecord?.summary ?? uncertaintyRecord?.level ?? simulation?.uncertainty,
  );
  const zones = objectRecord(simulation?.zones ?? simulation?.zone_directions);
  const zoneDirections = zones
    ? Object.entries(zones).flatMap(([zone, value]) => {
        const rendered = stringValue(value);
        return rendered ? [{ zone, direction: rendered }] : [];
      })
    : [];
  const confidence = scenario.confidence ?? "insufficient_data";
  const sufficient = scenario.status === "completed" && SUFFICIENT_CONFIDENCE.has(confidence) && direction !== null;

  return {
    status: sufficient ? "ready" : "insufficient_data",
    label: "Estimated scenario projection",
    window: scenario.window,
    direction: sufficient ? direction : null,
    uncertainty: sufficient ? (uncertainty ?? "Not provided by persisted result") : null,
    confidence,
    dataSufficiency: `${scenario.sourceRecordRefs.length} persisted source record reference${scenario.sourceRecordRefs.length === 1 ? "" : "s"}`,
    zoneDirections: sufficient ? zoneDirections : [],
    projectedMarkers: [],
    granularity: "abstract_zone",
    explanation: sufficient
      ? "Projection is shown at an abstract zone level; precise future lesion coordinates are never invented."
      : "A completed projection with moderate or high confidence and a persisted direction is required; low-confidence output stays abstract and hidden.",
    disclaimer: "Estimated from persisted inputs; not a guaranteed outcome.",
  };
}
