"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Plan = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  startedAt: string | null;
  schedule: unknown;
};

type Checkin = {
  id: string;
  planId: string;
  checkinDate: string;
  status: string;
  irritation: number | null;
  notes: string | null;
};

type PanelState = "loading" | "ready" | "auth_required" | "database_unavailable" | "invalid" | "safety_blocked" | "not_found";

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
    case "auth_required": return "Sign in before loading or saving treatment records.";
    case "database_unavailable": return "Treatment persistence is unavailable. No plan or check-in was reported as saved.";
    case "safety_blocked": return "Only provider-directed treatment plans can be recorded here. AcneTrex does not prescribe or recommend treatment.";
    case "not_found": return "The selected treatment plan is not owned by this account, so the check-in was not saved.";
    case "invalid": return "Complete the required fields and select an active plan before submitting.";
    default: return "Record a treatment plan supplied by a clinician, then log observed use and tolerance. These records can support reports and adherence analysis without generating treatment advice.";
  }
}

function scheduleValue(schedule: unknown, key: string): string | null {
  if (typeof schedule !== "object" || schedule === null || !(key in schedule)) return null;
  const value = (schedule as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}

export function TreatmentWorkflowPanel({ checkinsOnly = false }: { checkinsOnly?: boolean }) {
  const [state, setState] = useState<PanelState>("loading");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [name, setName] = useState("");
  const [activeIngredient, setActiveIngredient] = useState("");
  const [startDate, setStartDate] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  const [instructions, setInstructions] = useState("");
  const [providerDirected, setProviderDirected] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [checkinDate, setCheckinDate] = useState("");
  const [checkinStatus, setCheckinStatus] = useState("used");
  const [irritation, setIrritation] = useState("");
  const [checkinNotes, setCheckinNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadRecords() {
    const token = await accessToken();
    if (!token) { setState("auth_required"); return; }
    const headers = { authorization: `Bearer ${token}` };
    const [plansResponse, checkinsResponse] = await Promise.all([
      fetch("/api/treatments/plans", { headers, cache: "no-store" }).catch(() => null),
      fetch("/api/treatments/checkins", { headers, cache: "no-store" }).catch(() => null),
    ]);
    if (!plansResponse || !checkinsResponse || !plansResponse.ok || !checkinsResponse.ok) {
      setState(plansResponse?.status === 503 || checkinsResponse?.status === 503 ? "database_unavailable" : "auth_required");
      return;
    }
    const planPayload = await plansResponse.json().catch(() => null) as { plans?: Plan[] } | null;
    const checkinPayload = await checkinsResponse.json().catch(() => null) as { checkins?: Checkin[] } | null;
    const loadedPlans = planPayload?.plans ?? [];
    setPlans(loadedPlans);
    setCheckins(checkinPayload?.checkins ?? []);
    setSelectedPlanId((current) => current || loadedPlans[0]?.id || "");
    setState("ready");
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRecords(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function createPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !name.trim() || !startDate || !providerDirected) {
      setState(providerDirected ? "invalid" : "safety_blocked");
      return;
    }
    setSubmitting(true);
    const token = await accessToken();
    if (!token) { setState("auth_required"); setSubmitting(false); return; }
    const response = await fetch("/api/treatments/plans", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}`, "idempotency-key": `treatment-plan-${crypto.randomUUID()}` },
      body: JSON.stringify({ name: name.trim(), activeIngredient: activeIngredient.trim() || undefined, startDate, reviewDate: reviewDate || undefined, instructions: instructions.trim() || undefined, providerDirected: true }),
    }).catch(() => null);
    const payload = await response?.json().catch(() => null) as { plan?: Plan; error?: string } | null;
    setSubmitting(false);
    if (!response?.ok || !payload?.plan) {
      setState(payload?.error === "provider_directed_treatment_required" ? "safety_blocked" : response?.status === 503 ? "database_unavailable" : "invalid");
      return;
    }
    setPlans((current) => [payload.plan!, ...current]);
    setSelectedPlanId(payload.plan.id);
    setName("");
    setActiveIngredient("");
    setInstructions("");
    setProviderDirected(false);
    setState("ready");
  }

  async function createCheckin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !selectedPlanId || !checkinDate) { setState("invalid"); return; }
    setSubmitting(true);
    const token = await accessToken();
    if (!token) { setState("auth_required"); setSubmitting(false); return; }
    const response = await fetch("/api/treatments/checkins", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}`, "idempotency-key": `treatment-checkin-${crypto.randomUUID()}` },
      body: JSON.stringify({ planId: selectedPlanId, checkinDate, status: checkinStatus, irritation: irritation === "" ? null : Number(irritation), notes: checkinNotes.trim() || undefined }),
    }).catch(() => null);
    const payload = await response?.json().catch(() => null) as { checkin?: Checkin; error?: string } | null;
    setSubmitting(false);
    if (!response?.ok || !payload?.checkin) {
      setState(payload?.error === "treatment_plan_not_found" ? "not_found" : response?.status === 503 ? "database_unavailable" : "invalid");
      return;
    }
    setCheckins((current) => [payload.checkin!, ...current]);
    setCheckinNotes("");
    setIrritation("");
    setState("ready");
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">Observed treatment records</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">Treatment Plan Center</h2>
        </div>
        <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">{state}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-700">{stateCopy(state)}</p>

      {!checkinsOnly ? (
        <form onSubmit={createPlan} className="mt-5 grid gap-4">
          <h3 className="text-base font-semibold text-slate-900">Record a provider-directed plan</h3>
          <label className="grid gap-1 text-sm font-semibold" htmlFor="treatment-plan-name">Plan name<input id="treatment-plan-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} className="rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>
          <label className="grid gap-1 text-sm font-semibold" htmlFor="treatment-active-ingredient">Active ingredient or product label<input id="treatment-active-ingredient" value={activeIngredient} onChange={(event) => setActiveIngredient(event.target.value)} maxLength={120} className="rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1 text-sm font-semibold" htmlFor="treatment-start-date">Start date<input id="treatment-start-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 font-normal" /></label><label className="grid gap-1 text-sm font-semibold" htmlFor="treatment-review-date">Review date<input id="treatment-review-date" type="date" value={reviewDate} onChange={(event) => setReviewDate(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 font-normal" /></label></div>
          <label className="grid gap-1 text-sm font-semibold" htmlFor="treatment-instructions">Provider instructions<textarea id="treatment-instructions" value={instructions} onChange={(event) => setInstructions(event.target.value)} maxLength={2000} className="min-h-20 rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>
          <label className="flex items-start gap-2 text-sm leading-6 text-slate-700"><input type="checkbox" checked={providerDirected} onChange={(event) => setProviderDirected(event.target.checked)} className="mt-1" />This is a treatment plan supplied or reviewed by a healthcare professional.</label>
          <button type="submit" disabled={submitting || state !== "ready"} className="w-fit rounded-md border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-500">{submitting ? "Saving..." : "Save treatment plan"}</button>
        </form>
      ) : null}

      <form onSubmit={createCheckin} className="mt-7 grid gap-4 border-t border-slate-200 pt-6">
        <h3 className="text-base font-semibold text-slate-900">Record a check-in</h3>
        <label className="grid gap-1 text-sm font-semibold" htmlFor="treatment-checkin-plan">Plan<select id="treatment-checkin-plan" value={selectedPlanId} onChange={(event) => setSelectedPlanId(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 font-normal"><option value="">Select a saved plan</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.title} ({plan.status})</option>)}</select></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1 text-sm font-semibold" htmlFor="treatment-checkin-date">Date<input id="treatment-checkin-date" type="date" value={checkinDate} onChange={(event) => setCheckinDate(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 font-normal" /></label><label className="grid gap-1 text-sm font-semibold" htmlFor="treatment-checkin-status">Observed status<select id="treatment-checkin-status" value={checkinStatus} onChange={(event) => setCheckinStatus(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 font-normal"><option value="used">Used</option><option value="partial">Partial</option><option value="delayed">Delayed</option><option value="skipped">Skipped</option><option value="stopped">Stopped</option></select></label></div>
        <label className="grid gap-1 text-sm font-semibold" htmlFor="treatment-irritation">Irritation observed (0-10)<input id="treatment-irritation" type="number" min="0" max="10" value={irritation} onChange={(event) => setIrritation(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>
        <label className="grid gap-1 text-sm font-semibold" htmlFor="treatment-checkin-notes">Notes<textarea id="treatment-checkin-notes" value={checkinNotes} onChange={(event) => setCheckinNotes(event.target.value)} maxLength={2000} className="min-h-20 rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>
        <button type="submit" disabled={submitting || state !== "ready" || plans.length === 0} className="w-fit rounded-md border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-500">{submitting ? "Saving..." : "Save check-in"}</button>
      </form>

      <div className="mt-7 grid gap-6 border-t border-slate-200 pt-6 md:grid-cols-2">
        <div><h3 className="text-sm font-semibold text-slate-900">Saved plans</h3><div className="mt-2 grid gap-2">{plans.length === 0 ? <p className="text-sm text-slate-600">No treatment plans saved yet.</p> : plans.map((plan) => <div key={plan.id} className="rounded-md border border-slate-200 bg-slate-50 p-3"><p className="text-sm font-semibold text-slate-900">{plan.title}</p><p className="mt-1 text-xs leading-5 text-slate-600">{plan.status} · started {plan.startedAt ? new Date(plan.startedAt).toLocaleDateString() : "not recorded"}{scheduleValue(plan.schedule, "activeIngredient") ? ` · ${scheduleValue(plan.schedule, "activeIngredient")}` : ""}</p></div>)}</div></div>
        <div><h3 className="text-sm font-semibold text-slate-900">Check-in history</h3><div className="mt-2 grid gap-2">{checkins.length === 0 ? <p className="text-sm text-slate-600">No treatment check-ins saved yet.</p> : checkins.map((checkin) => <div key={checkin.id} className="rounded-md border border-slate-200 bg-slate-50 p-3"><p className="text-sm font-semibold text-slate-900">{checkin.checkinDate} · {checkin.status}</p><p className="mt-1 text-xs leading-5 text-slate-600">Irritation: {checkin.irritation === null ? "not recorded" : checkin.irritation}/10{checkin.notes ? ` · ${checkin.notes}` : ""}</p></div>)}</div></div>
      </div>
    </section>
  );
}
