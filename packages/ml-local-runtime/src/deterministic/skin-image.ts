export const SKIN_IMAGE_EXPECTED_METADATA_FIELDS = [
  "bytes",
  "contrast",
  "height",
  "laplacianVariance",
  "meanB",
  "meanBrightness",
  "meanG",
  "meanR",
  "width",
] as const;

export interface SkinImageCaptureMetadata {
  angle?: string;
  width?: number;
  height?: number;
  bytes?: number;
  meanBrightness?: number;
  contrast?: number;
  laplacianVariance?: number;
  meanR?: number;
  meanG?: number;
  meanB?: number;
}

export interface SkinImageZoneSummary {
  angle: string;
  state: "described" | "insufficient_metadata";
  rednessIndex: number | null;
  textureContrastIndex: number | null;
  metadataFieldsPresent: string[];
}

export interface SkinImageMetadataSummary {
  state: "ready" | "partial" | "insufficient_data";
  rednessIndex: number | null;
  textureContrastIndex: number | null;
  metadataCompleteness: number;
  zonesWithMetadata: string[];
  zonesMissingMetadata: string[];
  zoneSummaries: SkinImageZoneSummary[];
  limitations: string[];
}

const LIMITATIONS = [
  "This is a descriptive summary of supplied image metadata statistics only.",
  "No skin condition is detected, graded, classified, or assessed.",
  "Indices describe channel share and metadata contrast, not clinical findings.",
];

const round3 = (value: number): number => Math.floor(value * 1000 + 0.5) / 1000;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const present = (value: number | undefined): value is number => value !== undefined && value !== null;

function rednessIndex(image: SkinImageCaptureMetadata): number | null {
  if (!present(image.meanR) || !present(image.meanG) || !present(image.meanB)) return null;
  const total = image.meanR + image.meanG + image.meanB;
  if (total <= 0) return null;
  return round3(clamp01((image.meanR / total - 0.38) / 0.25));
}

function textureContrastIndex(image: SkinImageCaptureMetadata): number | null {
  const components: number[] = [];
  if (present(image.laplacianVariance)) components.push(clamp01((image.laplacianVariance - 100) / 700));
  if (present(image.contrast)) components.push(clamp01((image.contrast - 0.05) / 0.30));
  if (!components.length) return null;
  return round3(components.reduce((sum, value) => sum + value, 0) / components.length);
}

function meanOrNull(values: number[]): number | null {
  return values.length ? round3(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
}

export function summarizeSkinImageMetadata(images: SkinImageCaptureMetadata[]): SkinImageMetadataSummary {
  if (!images.length) {
    return {
      state: "insufficient_data",
      rednessIndex: null,
      textureContrastIndex: null,
      metadataCompleteness: 0,
      zonesWithMetadata: [],
      zonesMissingMetadata: [],
      zoneSummaries: [],
      limitations: LIMITATIONS,
    };
  }

  const completenessValues: number[] = [];
  const zoneSummaries = images.map((image): SkinImageZoneSummary => {
    const metadataFieldsPresent = SKIN_IMAGE_EXPECTED_METADATA_FIELDS
      .filter((field) => present(image[field]))
      .map((field) => field as string)
      .sort();
    completenessValues.push(metadataFieldsPresent.length / SKIN_IMAGE_EXPECTED_METADATA_FIELDS.length);
    const redness = rednessIndex(image);
    const textureContrast = textureContrastIndex(image);
    return {
      angle: image.angle ?? "unknown",
      state: redness !== null || textureContrast !== null ? "described" : "insufficient_metadata",
      rednessIndex: redness,
      textureContrastIndex: textureContrast,
      metadataFieldsPresent,
    };
  });

  const described = zoneSummaries.filter((zone) => zone.state === "described");
  const state = !described.length
    ? "insufficient_data"
    : described.length === zoneSummaries.length
      ? "ready"
      : "partial";

  return {
    state,
    rednessIndex: meanOrNull(described.flatMap((zone) => (zone.rednessIndex === null ? [] : [zone.rednessIndex]))),
    textureContrastIndex: meanOrNull(
      described.flatMap((zone) => (zone.textureContrastIndex === null ? [] : [zone.textureContrastIndex])),
    ),
    metadataCompleteness: round3(
      completenessValues.reduce((sum, value) => sum + value, 0) / completenessValues.length,
    ),
    zonesWithMetadata: [...new Set(described.map((zone) => zone.angle))].sort(),
    zonesMissingMetadata: [
      ...new Set(zoneSummaries.filter((zone) => zone.state === "insufficient_metadata").map((zone) => zone.angle)),
    ].sort(),
    zoneSummaries,
    limitations: LIMITATIONS,
  };
}
