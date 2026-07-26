"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  evaluateCaptureUploadGate,
  runFaceCaptureUploadFlow,
  type CaptureFlowOutcome,
  type CaptureUploadGateReason,
  type FaceCaptureConsentState,
} from "@/lib/acnetrex/faceatlas/capture-flow";

const angles = [
  ["front", "Front"],
  ["left", "Left profile"],
  ["right", "Right profile"],
  ["chin_up", "Chin up"],
  ["forehead", "Forehead"],
] as const;

type Scan = {
  id: string;
  angle: (typeof angles)[number][0];
  status: string;
  capturedAt: string;
};

type PanelState = "loading" | "ready" | "auth_required" | "consent_required" | "database_unavailable" | "not_configured";

async function sessionInfo(): Promise<{ token: string; userId: string } | null> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token ?? null;
    const userId = data.session?.user?.id ?? null;
    return token && userId ? { token, userId } : null;
  } catch {
    return null;
  }
}

function stateCopy(state: PanelState): string {
  switch (state) {
    case "auth_required": return "Sign in before saving capture metadata.";
    case "consent_required": return "Raw-image retention requires an explicit consent setting. Nothing was retained.";
    case "database_unavailable": return "The capture record could not be saved. No success was reported.";
    case "not_configured": return "Supabase browser configuration is unavailable in this environment.";
    default: return "Capture metadata is saved only after authenticated persistence succeeds. Raw-image upload and analysis are separate, consent-gated steps with their own honest states.";
  }
}

function gateCopy(reason: CaptureUploadGateReason): string {
  switch (reason) {
    case "file_missing":
      return "No photo selected — only capture metadata will be saved.";
    case "unsupported_file_type":
      return "Only JPEG photos can be uploaded (shared storage contract). Select a .jpg file or save metadata only.";
    case "dimensions_unmeasurable":
      return "The photo's dimensions could not be measured in this browser, so the upload was skipped. Metadata-only capture saved.";
    case "capture_retention_declined":
      return "Raw-image retention is declined for this capture (the retain checkbox is unchecked), so no photo bytes leave this browser. Only capture metadata is saved.";
    case "raw_image_learning_consent_missing":
      return "Raw-image upload is disabled: the raw-image consent in your consent settings is not recorded. Nothing was uploaded.";
    case "raw_image_retention_consent_missing":
      return "Raw-image upload is disabled: the account-level raw-image retention consent is not recorded, so the private bucket would reject the upload. Nothing was uploaded.";
  }
}

function uploadCopy(outcome: CaptureFlowOutcome): string {
  switch (outcome.upload) {
    case "stored": return "Raw image stored in the private bucket.";
    case "skipped_no_file": return "No photo selected; metadata-only capture saved.";
    case "skipped_unsupported_file": return "Photo skipped: unsupported file type; metadata-only capture saved.";
    case "skipped_unmeasurable_dimensions": return "Photo skipped: dimensions could not be measured; metadata-only capture saved.";
    case "skipped_retention_declined": return "Photo skipped: raw-image retention declined for this capture; nothing was uploaded or retained. Metadata-only capture saved.";
    case "skipped_consent_absent": return "Photo skipped: raw-image consent not recorded; metadata-only capture saved.";
    case "failed": return `Upload did not complete (${outcome.error?.code ?? "unknown_error"}). No success was reported.`;
    case "not_attempted": return "Upload was not attempted.";
  }
}

function finalizeCopy(outcome: CaptureFlowOutcome): string | null {
  switch (outcome.finalize) {
    case "queued_for_cloud": return "Upload verified server-side; scan queued for real cloud analysis.";
    case "already_finalized": return "Scan was already finalized; no duplicate analysis was queued.";
    case "failed": return `Finalization did not complete (${outcome.error?.code ?? "unknown_error"}). The scan keeps its real status.`;
    case "skipped":
    case "not_attempted": return null;
  }
}

async function measureJpegDimensions(file: File): Promise<{ width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions.width > 0 && dimensions.height > 0 ? dimensions : null;
  } catch {
    return null;
  }
}

export function FaceAtlasCapturePanel() {
  const [state, setState] = useState<PanelState>("loading");
  const [scans, setScans] = useState<Scan[]>([]);
  const [angle, setAngle] = useState<Scan["angle"]>("front");
  const [notes, setNotes] = useState("");
  const [analysisConsent, setAnalysisConsent] = useState(false);
  const [rawImageRetention, setRawImageRetention] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState<FaceCaptureConsentState | null>(null);
  const [outcome, setOutcome] = useState<CaptureFlowOutcome | null>(null);
  const [flowNotice, setFlowNotice] = useState<string | null>(null);

  async function loadConsent(userId: string) {
    // Same consent sources as the mobile client: consent_settings gates the
    // capture-side raw-image step; consents.raw_image_retention is what the
    // bucket policy checks. Absent rows honestly mean "not recorded".
    // `consent_settings` is a legacy web-compat table (RLS: user_id =
    // auth.uid()::text) that is not part of the generated Database types, so
    // the read goes through a narrowly-typed view of the same client.
    const legacyTables = supabase as unknown as {
      from(table: "consent_settings"): {
        select(columns: "raw_image_learning"): {
          eq(column: "user_id", value: string): {
            maybeSingle(): Promise<{
              data: { raw_image_learning: boolean | null } | null;
              error: { message: string } | null;
            }>;
          };
        };
      };
    };
    try {
      const [settingsResult, consentsResult] = await Promise.all([
        legacyTables.from("consent_settings").select("raw_image_learning").eq("user_id", userId).maybeSingle(),
        supabase.from("consents").select("raw_image_retention").eq("user_id", userId).maybeSingle(),
      ]);
      setConsent({
        rawImageLearning: !settingsResult.error && settingsResult.data?.raw_image_learning === true,
        rawImageRetention: !consentsResult.error && consentsResult.data?.raw_image_retention === true,
      });
    } catch {
      setConsent(null);
    }
  }

  async function loadScans() {
    const session = await sessionInfo();
    if (!session) { setState("auth_required"); return; }
    const response = await fetch("/api/faceatlas/scans", { headers: { authorization: `Bearer ${session.token}` }, cache: "no-store" }).catch(() => null);
    if (!response) { setState("database_unavailable"); return; }
    const payload = await response.json().catch(() => null) as { scans?: Scan[]; error?: string } | null;
    if (!response.ok) { setState(response.status === 503 ? "database_unavailable" : "not_configured"); return; }
    setScans(payload?.scans ?? []);
    await loadConsent(session.userId);
    setState("ready");
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadScans(); }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!analysisConsent || submitting) return;
    setSubmitting(true);
    setOutcome(null);
    setFlowNotice(null);
    const session = await sessionInfo();
    if (!session) { setState("auth_required"); setSubmitting(false); return; }

    const gate = evaluateCaptureUploadGate({
      consent: consent ?? { rawImageLearning: false, rawImageRetention: false },
      file,
      captureRetentionRequested: rawImageRetention,
    });
    if (!gate.allowed) setFlowNotice(gateCopy(gate.reason));

    let dimensions: { width: number; height: number } | null = null;
    if (gate.allowed && file) {
      dimensions = await measureJpegDimensions(file);
      if (!dimensions) {
        // Honest refusal: without measured dimensions the server cannot run
        // the capture-quality check, so no raw bytes are uploaded.
        setFlowNotice(gateCopy("dimensions_unmeasurable"));
      }
    }
    const effectiveGate = gate.allowed && !dimensions
      ? ({ allowed: false, reason: "dimensions_unmeasurable" } as const)
      : gate;

    const headers = (extra: Record<string, string> = {}) => ({
      "content-type": "application/json",
      authorization: `Bearer ${session.token}`,
      ...extra,
    });

    const result = await runFaceCaptureUploadFlow(
      {
        createScan: async () => {
          const response = await fetch("/api/faceatlas/scans", {
            method: "POST",
            headers: headers({ "idempotency-key": `faceatlas-${crypto.randomUUID()}` }),
            body: JSON.stringify({ angle, notes: notes.trim() || undefined, analysisConsent: true, rawImageRetention }),
          }).catch(() => null);
          const payload = await response?.json().catch(() => null) as { scan?: Scan; error?: string } | null;
          if (!response?.ok || !payload?.scan) {
            return { ok: false, code: payload?.error ?? (response ? `http_${response.status}` : "network_error") };
          }
          return { ok: true, scan: { id: payload.scan.id, status: payload.scan.status } };
        },
        authorizeUpload: async (scanId) => {
          const response = await fetch(`/api/faceatlas/scans/${scanId}/upload`, {
            method: "POST",
            headers: headers({ "idempotency-key": `faceatlas-upload-${crypto.randomUUID()}` }),
          }).catch(() => null);
          const payload = await response?.json().catch(() => null) as { scan?: Scan; upload?: { path?: string }; error?: string } | null;
          if (!response?.ok || !payload?.upload?.path || !payload.scan) {
            return { ok: false, code: payload?.error ?? (response ? `http_${response.status}` : "network_error") };
          }
          return { ok: true, path: payload.upload.path, scanStatus: payload.scan.status };
        },
        uploadObject: async (path) => {
          if (!file) return { ok: false, code: "file_missing" };
          try {
            const { error } = await supabase.storage
              .from("face-scans-raw")
              .upload(path, file, { contentType: "image/jpeg", upsert: false });
            return error ? { ok: false, code: error.message } : { ok: true };
          } catch {
            return { ok: false, code: "storage_unreachable" };
          }
        },
        finalizeScan: async (scanId) => {
          const response = await fetch(`/api/faceatlas/scans/${scanId}/finalize`, {
            method: "POST",
            headers: headers({ "idempotency-key": `faceatlas-finalize-${crypto.randomUUID()}` }),
            body: JSON.stringify(dimensions),
          }).catch(() => null);
          const payload = await response?.json().catch(() => null) as {
            scan?: Scan;
            alreadyFinalized?: boolean;
            quality?: { issueCodes?: string[] };
            error?: string;
          } | null;
          if (!response?.ok || !payload?.scan) {
            return { ok: false, code: payload?.error ?? (response ? `http_${response.status}` : "network_error") };
          }
          return {
            ok: true,
            scanStatus: payload.scan.status,
            alreadyFinalized: payload.alreadyFinalized === true,
            qualityIssueCodes: payload.quality?.issueCodes ?? [],
          };
        },
      },
      effectiveGate,
    );

    setSubmitting(false);
    if (result.error?.step === "create") {
      setState(result.error.code === "consent_required" ? "consent_required" : result.error.code.startsWith("http_5") || result.error.code.startsWith("database") ? "database_unavailable" : "not_configured");
      return;
    }
    setOutcome(result);
    setNotes("");
    setFile(null);
    setAnalysisConsent(false);
    // Per-capture choice: never carries over to the next capture.
    setRawImageRetention(false);
    setState("ready");
    await loadScans();
  }

  const uploadGate = evaluateCaptureUploadGate({
    consent: consent ?? { rawImageLearning: false, rawImageRetention: false },
    file,
    captureRetentionRequested: rawImageRetention,
  });

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">Annotation-first capture</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">Start a FaceAtlas angle</h2>
        </div>
        <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">{state}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-700">{stateCopy(state)}</p>

      <form onSubmit={submit} className="mt-5 grid gap-4">
        <fieldset>
          <legend className="text-sm font-semibold text-slate-900">Angle</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {angles.map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800">
                <input type="radio" name="face-angle" value={value} checked={angle === value} onChange={() => setAngle(value)} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="grid gap-1 text-sm font-semibold text-slate-900" htmlFor="faceatlas-notes">
          Capture notes
          <textarea id="faceatlas-notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={2000} className="min-h-20 rounded-md border border-slate-300 px-3 py-2 font-normal" />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-900" htmlFor="faceatlas-photo">
          Photo (JPEG, optional)
          <input
            id="faceatlas-photo"
            type="file"
            accept="image/jpeg"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="rounded-md border border-slate-300 px-3 py-2 font-normal"
          />
        </label>
        {file && !uploadGate.allowed ? (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">{gateCopy(uploadGate.reason)}</p>
        ) : null}
        <label className="flex items-start gap-2 text-sm leading-6 text-slate-700">
          <input type="checkbox" checked={analysisConsent} onChange={(event) => setAnalysisConsent(event.target.checked)} className="mt-1" />
          I consent to this capture being used for my FaceAtlas analysis workflow. No model result is shown until a real analysis service returns one.
        </label>
        <label className="flex items-start gap-2 text-sm leading-6 text-slate-700">
          <input type="checkbox" checked={rawImageRetention} onChange={(event) => setRawImageRetention(event.target.checked)} className="mt-1" />
          Upload and retain the raw image for this capture (requires the account-level raw-image retention consent). Leave unchecked to save metadata only — no photo bytes are uploaded.
        </label>
        <button type="submit" disabled={!analysisConsent || submitting || state !== "ready"} className="w-fit rounded-md border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-500">
          {submitting ? "Saving..." : file && uploadGate.allowed ? "Save capture and upload photo" : "Save capture metadata"}
        </button>
      </form>

      {flowNotice ? (
        <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">{flowNotice}</p>
      ) : null}
      {outcome ? (
        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
          <h3 className="text-sm font-semibold text-slate-900">Last capture result</h3>
          <p className="mt-1 text-sm text-slate-700">Scan status: {outcome.scanStatus ?? "not_saved"}</p>
          <p className="mt-1 text-sm text-slate-700">{uploadCopy(outcome)}</p>
          {finalizeCopy(outcome) ? <p className="mt-1 text-sm text-slate-700">{finalizeCopy(outcome)}</p> : null}
          {outcome.qualityIssueCodes && outcome.qualityIssueCodes.length > 0 ? (
            <p className="mt-1 text-sm text-slate-700">Capture-quality checks flagged: {outcome.qualityIssueCodes.join(", ")} (metadata checks only; no lesion detection).</p>
          ) : null}
          {outcome.qualityIssueCodes && outcome.qualityIssueCodes.length === 0 && outcome.finalize === "queued_for_cloud" ? (
            <p className="mt-1 text-sm text-slate-700">Capture-quality metadata checks flagged no issues (they do not detect or classify lesions).</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-slate-900">Capture history</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {scans.length === 0 ? <p className="text-sm text-slate-600">No capture metadata saved yet.</p> : null}
          {scans.map((scan) => (
            <div key={scan.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-900">{scan.angle}</p>
              <p className="mt-1 text-xs text-slate-600">{scan.status} · {new Date(scan.capturedAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
