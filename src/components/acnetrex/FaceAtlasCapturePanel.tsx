"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

async function accessToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
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
    default: return "Capture metadata is saved only after authenticated persistence succeeds. Image upload and analysis remain separate, gated steps.";
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

  async function loadScans() {
    const token = await accessToken();
    if (!token) { setState("auth_required"); return; }
    const response = await fetch("/api/faceatlas/scans", { headers: { authorization: `Bearer ${token}` }, cache: "no-store" }).catch(() => null);
    if (!response) { setState("database_unavailable"); return; }
    const payload = await response.json().catch(() => null) as { scans?: Scan[]; error?: string } | null;
    if (!response.ok) { setState(response.status === 503 ? "database_unavailable" : "not_configured"); return; }
    setScans(payload?.scans ?? []);
    setState("ready");
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadScans(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!analysisConsent || submitting) return;
    setSubmitting(true);
    const token = await accessToken();
    if (!token) { setState("auth_required"); setSubmitting(false); return; }
    const response = await fetch("/api/faceatlas/scans", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        "idempotency-key": `faceatlas-${crypto.randomUUID()}`,
      },
      body: JSON.stringify({ angle, notes: notes.trim() || undefined, analysisConsent: true, rawImageRetention }),
    }).catch(() => null);
    const payload = await response?.json().catch(() => null) as { scan?: Scan; error?: string } | null;
    setSubmitting(false);
    if (!response?.ok || !payload?.scan) {
      setState(payload?.error === "consent_required" ? "consent_required" : response?.status === 503 ? "database_unavailable" : "not_configured");
      return;
    }
    setScans((current) => [payload.scan!, ...current]);
    setNotes("");
    setAnalysisConsent(false);
    setState("ready");
  }

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
        <label className="flex items-start gap-2 text-sm leading-6 text-slate-700">
          <input type="checkbox" checked={analysisConsent} onChange={(event) => setAnalysisConsent(event.target.checked)} className="mt-1" />
          I consent to this capture being used for my FaceAtlas analysis workflow. No model result is shown until a real analysis service returns one.
        </label>
        <label className="flex items-start gap-2 text-sm leading-6 text-slate-700">
          <input type="checkbox" checked={rawImageRetention} onChange={(event) => setRawImageRetention(event.target.checked)} className="mt-1" />
          Retain the raw image after upload (requires the account-level raw-image retention consent).
        </label>
        <button type="submit" disabled={!analysisConsent || submitting || state !== "ready"} className="w-fit rounded-md border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-500">
          {submitting ? "Saving..." : "Save capture metadata"}
        </button>
      </form>

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
