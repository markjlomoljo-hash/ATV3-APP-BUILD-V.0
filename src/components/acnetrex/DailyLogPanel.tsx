"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DAILY_LOG_KINDS,
  buildDailyLogSubmission,
  summarizeDailyLogEntry,
  type DailyLogEntry,
  type DailyLogField,
  type DailyLogKindSlug,
} from "@/lib/acnetrex/daily-logs/kinds";

type PanelState =
  | "loading"
  | "ready"
  | "auth_required"
  | "database_unavailable"
  | "invalid"
  | "unavailable";

async function accessToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

function stateCopy(state: PanelState, kindTitle: string): string {
  switch (state) {
    case "auth_required":
      return "Sign in before loading or saving daily-log records.";
    case "database_unavailable":
      return "Log persistence is unavailable. Nothing was reported as saved.";
    case "invalid":
      return "Fix the highlighted fields before submitting.";
    case "unavailable":
      return "This log service did not respond. No record was saved.";
    case "loading":
      return "Checking your session and loading saved records...";
    default:
      return `${kindTitle} entries save to the same tables the mobile app uses, so web and mobile records form one history.`;
  }
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function fieldControlClass(): string {
  return "rounded-md border border-slate-300 px-3 py-2 font-normal";
}

export function DailyLogPanel({ kind }: { kind: DailyLogKindSlug }) {
  const definition = DAILY_LOG_KINDS[kind];
  const [state, setState] = useState<PanelState>("loading");
  const [entries, setEntries] = useState<DailyLogEntry[]>([]);
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    definition.singleton ? {} : { logDate: todayDate() },
  );
  const [issues, setIssues] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [savedEntryId, setSavedEntryId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    const token = await accessToken();
    if (!token) {
      setState("auth_required");
      return;
    }
    const response = await fetch(`/api/logs/${kind}`, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    }).catch(() => null);
    if (!response) {
      setState("unavailable");
      return;
    }
    if (!response.ok) {
      setState(response.status === 503 ? "database_unavailable" : "auth_required");
      return;
    }
    const payload = (await response.json().catch(() => null)) as { entries?: DailyLogEntry[] } | null;
    setEntries(payload?.entries ?? []);
    setState("ready");
  }, [kind]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadHistory(), 0);
    return () => window.clearTimeout(timer);
  }, [loadHistory]);

  function setField(name: string, value: unknown) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function toggleMultiselect(name: string, option: string) {
    setValues((current) => {
      const existing = Array.isArray(current[name]) ? (current[name] as string[]) : [];
      const next = existing.includes(option)
        ? existing.filter((item) => item !== option)
        : [...existing, option];
      return { ...current, [name]: next };
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSavedEntryId(null);

    const submission = buildDailyLogSubmission(kind, values);
    if (!submission.ok) {
      setIssues(submission.issues);
      setState("invalid");
      return;
    }
    setIssues([]);
    setSubmitting(true);

    const token = await accessToken();
    if (!token) {
      setState("auth_required");
      setSubmitting(false);
      return;
    }

    const response = await fetch(`/api/logs/${kind}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        "idempotency-key": `daily-log-${kind}-${crypto.randomUUID()}`,
      },
      body: JSON.stringify(submission.payload),
    }).catch(() => null);
    const payload = (await response?.json().catch(() => null)) as
      | { entry?: DailyLogEntry; error?: string }
      | null;
    setSubmitting(false);

    if (!response || !response.ok || !payload?.entry) {
      if (response?.status === 401) setState("auth_required");
      else if (response?.status === 503) setState("database_unavailable");
      else if (response?.status === 400 || response?.status === 409) {
        setIssues([payload?.error ?? "invalid_daily_log_payload"]);
        setState("invalid");
      } else setState("unavailable");
      return;
    }

    const saved = payload.entry;
    setEntries((current) => {
      const withoutReplaced = current.filter((item) => item.id !== saved.id);
      return [saved, ...withoutReplaced];
    });
    setSavedEntryId(saved.id);
    setValues((current) => (definition.singleton ? {} : { logDate: (current.logDate as string) ?? todayDate() }));
    setState("ready");
  }

  function renderField(field: DailyLogField) {
    const id = `daily-log-${kind}-${field.name}`;

    if (field.input === "checkbox") {
      return (
        <label key={field.name} className="flex items-start gap-2 text-sm leading-6 text-slate-700" htmlFor={id}>
          <input
            id={id}
            type="checkbox"
            checked={values[field.name] === true}
            onChange={(event) => setField(field.name, event.target.checked)}
            className="mt-1"
          />
          <span>
            <span className="font-semibold text-slate-900">{field.label}</span>
            <span className="mt-0.5 block text-xs leading-5 text-slate-500">{field.help}</span>
          </span>
        </label>
      );
    }

    if (field.input === "multiselect") {
      const selected = Array.isArray(values[field.name]) ? (values[field.name] as string[]) : [];
      return (
        <fieldset key={field.name} className="grid gap-1 text-sm">
          <legend className="font-semibold text-slate-900">{field.label}</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {(field.options ?? []).map((option) => (
              <label
                key={option.value}
                className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium ${
                  selected.includes(option.value)
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-700"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option.value)}
                  onChange={() => toggleMultiselect(field.name, option.value)}
                  className="sr-only"
                />
                {option.label}
              </label>
            ))}
          </div>
          <p className="text-xs leading-5 text-slate-500">{field.help}</p>
        </fieldset>
      );
    }

    if (field.input === "select") {
      return (
        <label key={field.name} className="grid gap-1 text-sm font-semibold" htmlFor={id}>
          {field.label}
          <select
            id={id}
            value={typeof values[field.name] === "string" ? (values[field.name] as string) : ""}
            onChange={(event) => setField(field.name, event.target.value)}
            className={fieldControlClass()}
          >
            <option value="">Select</option>
            {(field.options ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="text-xs font-normal leading-5 text-slate-500">{field.help}</span>
        </label>
      );
    }

    if (field.input === "textarea") {
      return (
        <label key={field.name} className="grid gap-1 text-sm font-semibold" htmlFor={id}>
          {field.label}
          <textarea
            id={id}
            value={typeof values[field.name] === "string" ? (values[field.name] as string) : ""}
            onChange={(event) => setField(field.name, event.target.value)}
            maxLength={2000}
            className={`${fieldControlClass()} min-h-20`}
          />
          <span className="text-xs font-normal leading-5 text-slate-500">{field.help}</span>
        </label>
      );
    }

    return (
      <label key={field.name} className="grid gap-1 text-sm font-semibold" htmlFor={id}>
        {field.label}
        <input
          id={id}
          type={field.input}
          min={field.min}
          max={field.max}
          placeholder={field.placeholder}
          value={typeof values[field.name] === "string" || typeof values[field.name] === "number" ? String(values[field.name]) : ""}
          onChange={(event) => setField(field.name, event.target.value)}
          className={fieldControlClass()}
        />
        <span className="text-xs font-normal leading-5 text-slate-500">{field.help}</span>
      </label>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">Daily log</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">{definition.title}</h2>
        </div>
        <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          {state}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-700">{stateCopy(state, definition.title)}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">Persistence target: {definition.table}</p>

      <form onSubmit={submit} className="mt-5 grid gap-4">
        {definition.fields.map((field) => renderField(field))}

        {issues.length > 0 ? (
          <ul role="alert" className="grid gap-1 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        ) : null}

        {savedEntryId ? (
          <p role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            Saved. The record below reflects what the database returned.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting || state === "loading" || state === "auth_required"}
          className="w-fit rounded-md border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-500"
        >
          {submitting ? "Saving..." : definition.submitLabel}
        </button>
      </form>

      <div className="mt-7 border-t border-slate-200 pt-6">
        <h3 className="text-sm font-semibold text-slate-900">{definition.historyTitle}</h3>
        <div className="mt-2 grid gap-2">
          {state === "loading" ? (
            <p className="text-sm text-slate-600">Loading saved records...</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-slate-600">{definition.emptyHistory}</p>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-900">
                  {entry.logDate ?? (entry.recordedAt ? `updated ${entry.recordedAt.slice(0, 10)}` : "date not recorded")}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">{summarizeDailyLogEntry(entry)}</p>
                {entry.notes ? <p className="mt-1 text-xs leading-5 text-slate-500">{entry.notes}</p> : null}
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
