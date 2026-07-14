"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const windows = [
  ["3d", "3 days"],
  ["7d", "7 days"],
  ["14d", "14 days"],
  ["30d", "30 days"],
  ["treatment_cycle", "Treatment cycle"],
  ["provider_review_custom", "Provider review"],
] as const;

const variables = [
  ["better_sleep", "Better sleep"],
  ["lower_stress", "Lower stress"],
  ["hydration_improvement", "Hydration improvement"],
  ["routine_consistency", "Routine consistency"],
  ["treatment_adherence", "Treatment adherence"],
] as const;

type Scenario = {
  id: string;
  name: string;
  window: string;
  status: string;
  confidence: string | null;
  simulation: unknown;
  snapshotAt: string;
};

type PanelState = "loading" | "ready" | "auth_required" | "consent_required" | "database_unavailable" | "invalid";

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
    case "auth_required": return "Sign in before saving or loading Skin Twin scenarios.";
    case "consent_required": return "Personal-learning consent is required. No scenario was saved.";
    case "database_unavailable": return "The scenario could not be persisted. No success was reported.";
    case "invalid": return "Choose at least one active variable and review the timeline requirements.";
    default: return "Skin Twin uses stored FaceAtlas, sleep, and food records. A projection is shown only after a real analysis worker returns one.";
  }
}

export function SkinTwinScenarioPanel() {
  const [state, setState] = useState<PanelState>("loading");
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [name, setName] = useState("");
  const [selectedWindow, setSelectedWindow] = useState<(typeof windows)[number][0]>("7d");
  const [selectedVariables, setSelectedVariables] = useState<string[]>(["better_sleep"]);
  const [providerReview, setProviderReview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function loadScenarios() {
    const token = await accessToken();
    if (!token) { setState("auth_required"); return; }
    const response = await fetch("/api/skin-twin/scenarios", { headers: { authorization: `Bearer ${token}` }, cache: "no-store" }).catch(() => null);
    if (!response) { setState("database_unavailable"); return; }
    const payload = await response.json().catch(() => null) as { scenarios?: Scenario[] } | null;
    if (!response.ok) { setState(response.status === 503 ? "database_unavailable" : "auth_required"); return; }
    setScenarios(payload?.scenarios ?? []);
    setState("ready");
  }

  useEffect(() => {
    const timer = globalThis.setTimeout(() => { void loadScenarios(); }, 0);
    return () => globalThis.clearTimeout(timer);
  }, []);

  function toggleVariable(value: string) {
    setSelectedVariables((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !name.trim() || selectedVariables.length === 0 || (selectedWindow === "provider_review_custom" && !providerReview)) {
      setState("invalid");
      return;
    }
    setSubmitting(true);
    const token = await accessToken();
    if (!token) { setState("auth_required"); setSubmitting(false); return; }
    const response = await fetch("/api/skin-twin/scenarios", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        "idempotency-key": `skin-twin-${crypto.randomUUID()}`,
      },
      body: JSON.stringify({ name: name.trim(), window: selectedWindow, variables: selectedVariables, providerReview }),
    }).catch(() => null);
    const payload = await response?.json().catch(() => null) as { scenario?: Scenario; snapshot?: Scenario; error?: string } | null;
    setSubmitting(false);
    if (!response?.ok || !payload?.snapshot) {
      setState(payload?.error === "consent_required" ? "consent_required" : response?.status === 503 ? "database_unavailable" : "invalid");
      return;
    }
    setScenarios((current) => [payload.snapshot!, ...current]);
    setName("");
    setState("ready");
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">Readiness-gated simulation</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">Build a Skin Twin scenario</h2>
        </div>
        <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">{state}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-700">{stateCopy(state)}</p>

      <form onSubmit={submit} className="mt-5 grid gap-4">
        <label className="grid gap-1 text-sm font-semibold text-slate-900" htmlFor="skin-twin-name">
          Scenario name
          <input id="skin-twin-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder="Example: steadier sleep week" className="rounded-md border border-slate-300 px-3 py-2 font-normal" />
        </label>
        <fieldset>
          <legend className="text-sm font-semibold text-slate-900">Projection window</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {windows.map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800">
                <input type="radio" name="skin-twin-window" value={value} checked={selectedWindow === value} onChange={() => setSelectedWindow(value)} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-semibold text-slate-900">Variables to compare</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {variables.map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800">
                <input type="checkbox" checked={selectedVariables.includes(value)} onChange={() => toggleVariable(value)} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        {selectedWindow === "provider_review_custom" ? (
          <label className="flex items-start gap-2 text-sm leading-6 text-slate-700">
            <input type="checkbox" checked={providerReview} onChange={(event) => setProviderReview(event.target.checked)} className="mt-1" />
            This custom timeline is intended for provider review.
          </label>
        ) : null}
        <button type="submit" disabled={submitting || state !== "ready"} className="w-fit rounded-md border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-500">
          {submitting ? "Saving..." : "Save scenario request"}
        </button>
      </form>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-slate-900">Scenario history</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {scenarios.length === 0 ? <p className="text-sm text-slate-600">No scenario requests saved yet.</p> : null}
          {scenarios.map((scenario) => (
            <div key={scenario.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{scenario.name}</p>
                <span className="text-xs font-semibold text-slate-600">{scenario.status}</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-600">{scenario.window} · No projection is displayed until a validated worker result exists.</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
