import { getObject } from "@/lib/storage";
import type { RawProfileBundle, ReportImageAttachment } from "./types";

const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_BYTES = 12 * 1024 * 1024;

function imageMimeType(bytes: Buffer): "image/png" | "image/jpeg" | null {
  const png = bytes.length >= 8 && bytes.subarray(0, 8).equals(
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  );
  if (png) return "image/png";
  const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return jpeg ? "image/jpeg" : null;
}

export async function loadFaceAtlasReportImages(
  bundle: RawProfileBundle,
  includeImages: boolean,
  loader: (storageRef: string) => Promise<Buffer> = getObject,
): Promise<{ attachments: ReportImageAttachment[]; unavailableCount: number }> {
  if (!includeImages) return { attachments: [], unavailableCount: 0 };
  const candidates = bundle.faceAtlasScans.slice(0, MAX_IMAGES);
  const attachments: ReportImageAttachment[] = [];
  let unavailableCount = 0;
  let totalBytes = 0;

  for (const scan of candidates) {
    if (!scan.imageStorageRef) {
      unavailableCount += 1;
      continue;
    }
    try {
      const bytes = await loader(scan.imageStorageRef);
      const mimeType = imageMimeType(bytes);
      if (!mimeType || bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES || totalBytes + bytes.byteLength > MAX_TOTAL_BYTES) {
        unavailableCount += 1;
        continue;
      }
      totalBytes += bytes.byteLength;
      attachments.push({ scanDate: scan.scanDate, mimeType, bytes });
    } catch {
      unavailableCount += 1;
    }
  }
  return { attachments, unavailableCount };
}
