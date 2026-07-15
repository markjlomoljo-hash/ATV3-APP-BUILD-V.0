export const REQUIRED_FACE_ANGLES = [
  "front",
  "left_45",
  "right_45",
  "forehead_upper",
  "chin_lower",
] as const;

export type FaceAngle = (typeof REQUIRED_FACE_ANGLES)[number];

export interface FaceCaptureMetadata {
  angle: FaceAngle;
  width: number;
  height: number;
  bytes: number;
  brightness?: number;
  contrast?: number;
  blurVariance?: number;
}

export interface FaceQualityResult {
  state: "ready" | "partial" | "insufficient_data";
  missingAngles: FaceAngle[];
  duplicateAngles: FaceAngle[];
  issues: Array<{ angle: FaceAngle; codes: string[] }>;
  limitations: string[];
}

export function assessFaceCapture(captures: FaceCaptureMetadata[]): FaceQualityResult {
  const counts = new Map<FaceAngle, number>();
  for (const capture of captures) counts.set(capture.angle, (counts.get(capture.angle) ?? 0) + 1);
  const missingAngles = REQUIRED_FACE_ANGLES.filter((angle) => !counts.has(angle));
  const duplicateAngles = REQUIRED_FACE_ANGLES.filter((angle) => (counts.get(angle) ?? 0) > 1);
  const issues = captures.map((capture) => {
    const codes: string[] = [];
    if (capture.width < 640 || capture.height < 480) codes.push("resolution_low");
    if (capture.bytes <= 0 || capture.bytes > 4 * 1024 * 1024) codes.push("file_size_invalid");
    if (capture.brightness !== undefined && (capture.brightness < 0.18 || capture.brightness > 0.9)) {
      codes.push("lighting_out_of_range");
    }
    if (capture.contrast !== undefined && capture.contrast < 0.08) codes.push("contrast_low");
    if (capture.blurVariance !== undefined && capture.blurVariance < 50) codes.push("blur_possible");
    return { angle: capture.angle, codes };
  }).filter((item) => item.codes.length > 0);
  const state = missingAngles.length
    ? "insufficient_data"
    : issues.length || duplicateAngles.length
      ? "partial"
      : "ready";

  return {
    state,
    missingAngles,
    duplicateAngles,
    issues,
    limitations: [
      "Local quality checks assess capture metadata only; they do not detect or classify lesions.",
      "Face presence and clinical image suitability require a separately validated vision model.",
    ],
  };
}
