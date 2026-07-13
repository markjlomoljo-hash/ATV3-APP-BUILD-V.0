"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type ReportStatus = "queued" | "processing" | "completed" | "failed";

type Report = {
  id: string;
  requestedAt: string;
  status: ReportStatus;
  inclusionOptions: {
    includeFaceAtlasPhotos: boolean;
    includeTreatmentDetails: boolean;
    includeSections: "all" | string[];
  };
  fileSizeBytes: number | null;
  failureReason: string | null;
};

type PanelState =
  | "loading"
  | "ready"
  | "auth_required"
  | "database_unavailable"
  | "invalid"
  | "request_failed";

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
    case "auth_required":
      return "Sign in before requesting or loading a report.";
    case "database_unavailable":
      return "Report persistence is unavailable. No request was reported as saved.";
    case "invalid":
      return "Select at least one report section before requesting a report.";
    case "request_failed":
      return "The report worker did not complete the request. Review the failure state and try again later.";
    default:
      return "Reports compile only from persisted account records and capture the current consent settings at request time. Missing data is labeled in the report rather than filled with estimates.";
  }
}

function formatBytes(value: number | null): string {
  if (value === null) return "No file";
  if (value < 1024) return `${value} B`;
  return `${(value / 1024).toFixed(1)} KB`;
}

export function ReportWorkflowPanel({ historyOnly = false }: { historyOnly?: boolean }) {
  const [state, setState] = useState<PanelState>("loading");
  const [history, setHistory] = useState<Report[]>([]);
  const [includeFaceAtlasPhotos, setIncludeFaceAtlasPhotos] = useState(false);
  const [includeTreatmentDetails, setIncludeTreatmentDetails] = useState(true);
  const [includeSections, setIncludeSections] = useState<string[]>(["all"]);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function loadHistory() {
    const token = await accessToken();
    if (!token) {
      setState("auth_required");
      return;
    }
    const response = await fetch("/api/reports/history", {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    }).catch(() => null);
    if (!response) {
      setState("database_unavailable");
      return;
    }
    const payload = (await response.json().catch(() => null)) as { history?: Report[]; error?: string } | null;
    if (!response.ok) {
      setState(response.status === 503 ? "database_unavailable" : "auth_required");
      return;
    }
    setHistory(payload?.history ?? []);
    setState("ready");
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadHistory(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function toggleSection(value: string) {
    setIncludeSections((current) => {
      if (value === "all") return ["all"];
      const withoutAll = current.filter((item) => item !== "all");
      return withoutAll.includes(value)
        ? withoutAll.filter((item) => item !== value)
        : [...withoutAll, value];
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || includeSections.length === 0) {
      setState("invalid");
      return;
    }
    setSubmitting(true);
    const token = await accessToken();
    if (!token) {
      setState("auth_required");
      setSubmitting(false);
      return;
    }
    const response = await fetch("/api/reports/dermatologist", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        idempotencyKey: `report-${crypto.randomUUID()}`,
        inclusionOptions: {
          includeFaceAtlasPhotos,
          includeTreatmentDetails,
          includeSections: includeSections.includes("all") ? "all" : includeSections,
        },
      }),
    }).catch(() => null);
    const payload = (await response?.json().catch(() => null)) as { reportRequestId?: string; status?: ReportStatus; error?: string } | null;
    setSubmitting(false);
    if (!response?.ok) {
      setState(response?.status === 503 ? "database_unavailable" : "request_failed");
      return;
    }
    await loadHistory();
    if (payload?.status === "failed") setState("request_failed");
  }

  async function download(reportId: string) {
    if (downloadingId) return;
    const token = await accessToken();
    if (!token) {
      setState("auth_required");
      return;
    }
    setDownloadingId(reportId);
    const response = await fetch(`/api/reports/${reportId}/download`, {
      headers: { authorization: `Bearer ${token}` },
    }).catch(() => null);
    if (!response?.ok) {
      setState(response?.status === 503 ? "database_unavailable" : "request_failed");
      setDownloadingId(null);
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `acnetrex-report-${reportId}.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
    setDownloadingId(null);
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">Persisted report workflow</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">Dermatologist-ready reports</h2>
        </div>
        <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">{state}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-700">{stateCopy(state)}</p>

      {!historyOnly ? (
        <form onSubmit={submit} className="mt-5 grid gap-4">
          <fieldset>
            <legend className="text-sm font-semibold text-slate-900">Report sections</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {[["all", "All available sections"], ["acne_history", "Acne history"], ["skin_profile", "Skin profile"], ["routine_inventory", "Routine inventory"], ["lifestyle_baseline", "Lifestyle context"]].map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800">
                  <input type="checkbox" checked={includeSections.includes(value)} onChange={() => toggleSection(value)} />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex items-start gap-2 text-sm leading-6 text-slate-700">
            <input type="checkbox" checked={includeTreatmentDetails} onChange={(event) => setIncludeTreatmentDetails(event.target.checked)} className="mt-1" />
            Include treatment details when the account consent setting allows it.
          </label>
          <label className="flex items-start gap-2 text-sm leading-6 text-slate-700">
            <input type="checkbox" checked={includeFaceAtlasPhotos} onChange={(event) => setIncludeFaceAtlasPhotos(event.target.checked)} className="mt-1" />
            Include retained FaceAtlas photos only when both this request and account consent allow it.
          </label>
          <button type="submit" disabled={submitting || state !== "ready"} className="w-fit rounded-md border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-500">
            {submitting ? "Requesting..." : "Request report"}
          </button>
        </form>
      ) : null}

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-slate-900">Report history</h3>
        <div className="mt-2 grid gap-2">
          {history.length === 0 ? <p className="text-sm text-slate-600">No report requests saved yet.</p> : null}
          {history.map((report) => (
            <div key={report.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{report.status}</p>
                <span className="text-xs text-slate-600">{new Date(report.requestedAt).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-600">{formatBytes(report.fileSizeBytes)} · {report.inclusionOptions.includeSections === "all" ? "All available sections" : "Selected sections"}</p>
              {report.failureReason ? <p className="mt-2 text-xs leading-5 text-rose-700">Worker failure: {report.failureReason}</p> : null}
              {report.status === "completed" ? (
                <button type="button" onClick={() => void download(report.id)} disabled={downloadingId === report.id} className="mt-3 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 disabled:opacity-60">
                  {downloadingId === report.id ? "Preparing download..." : "Download PDF"}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
