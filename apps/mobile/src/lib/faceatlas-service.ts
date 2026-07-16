import { apiFetch } from "./api";
import {
  buildObservedSkinViewModel,
  latestCompletedScan,
  type FaceAtlasScan,
  type FaceAtlasScanDetail,
  type ObservedSkinViewModel,
} from "./faceatlas-visualization";

export async function fetchFaceAtlasScans(): Promise<FaceAtlasScan[]> {
  const response = await apiFetch<{ ok: true; scans: FaceAtlasScan[] }>("/api/faceatlas/scans");
  return response.scans;
}

export async function fetchFaceAtlasScanDetail(scanId: string): Promise<FaceAtlasScanDetail> {
  const response = await apiFetch<{ ok: true } & FaceAtlasScanDetail>(
    `/api/faceatlas/scans/${encodeURIComponent(scanId)}`,
  );
  return { scan: response.scan, annotations: response.annotations };
}

export async function fetchLatestObservedSkin(): Promise<ObservedSkinViewModel> {
  const scans = await fetchFaceAtlasScans();
  const latest = latestCompletedScan(scans);
  if (!latest) return buildObservedSkinViewModel(null);
  const detail = await fetchFaceAtlasScanDetail(latest.id);
  // The API deliberately does not expose a signed raw-image URL. The neutral
  // model therefore remains the privacy-preserving default.
  return buildObservedSkinViewModel(detail);
}
