"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Task = {
  id: string;
  planId: string;
  taskName: string;
  dueAt: string | null;
  completedAt: string | null;
  skipped: boolean;
};

type Plan = { id: string; title: string; status: string };
type PanelState = "loading" | "ready" | "auth_required" | "database_unavailable" | "invalid" | "request_failed";

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
      return "Sign in before loading or changing personal tasks.";
    case "database_unavailable":
      return "Task persistence is unavailable. No task was reported as saved.";
    case "invalid":
      return "Select a saved plan and enter a task name before saving.";
    case "request_failed":
      return "The task operation failed. Review the current records and try again later.";
    default:
      return "Tasks are attached to owner-scoped, provider-directed treatment plans. AcneTrex does not invent tasks, points, streaks, or completion states.";
  }
}

export function TaskWorkflowPanel() {
  const [state, setState] = useState<PanelState>("loading");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [planId, setPlanId] = useState("");
  const [taskName, setTaskName] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function load() {
    const token = await accessToken();
    if (!token) {
      setState("auth_required");
      return;
    }
    const headers = { authorization: `Bearer ${token}` };
    const [plansResponse, tasksResponse] = await Promise.all([
      fetch("/api/treatments/plans", { headers, cache: "no-store" }).catch(() => null),
      fetch("/api/treatments/tasks", { headers, cache: "no-store" }).catch(() => null),
    ]);
    if (!plansResponse || !tasksResponse || !plansResponse.ok || !tasksResponse.ok) {
      setState(plansResponse?.status === 401 || tasksResponse?.status === 401 ? "auth_required" : "database_unavailable");
      return;
    }
    const plansPayload = (await plansResponse.json().catch(() => null)) as { plans?: Plan[] } | null;
    const tasksPayload = (await tasksResponse.json().catch(() => null)) as { tasks?: Task[] } | null;
    const nextPlans = plansPayload?.plans ?? [];
    setPlans(nextPlans);
    setTasks(tasksPayload?.tasks ?? []);
    setPlanId((current) => current || nextPlans[0]?.id || "");
    setState("ready");
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !planId || !taskName.trim()) {
      setState("invalid");
      return;
    }
    setSaving(true);
    const token = await accessToken();
    if (!token) {
      setState("auth_required");
      setSaving(false);
      return;
    }
    const response = await fetch("/api/treatments/tasks", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        "idempotency-key": `task-${crypto.randomUUID()}`,
      },
      body: JSON.stringify({ planId, taskName: taskName.trim(), dueAt: dueAt ? new Date(dueAt).toISOString() : null }),
    }).catch(() => null);
    setSaving(false);
    if (!response?.ok) {
      setState(response?.status === 503 ? "database_unavailable" : "request_failed");
      return;
    }
    setTaskName("");
    setDueAt("");
    await load();
  }

  async function updateTask(task: Task, skipped: boolean) {
    if (updatingId) return;
    const token = await accessToken();
    if (!token) {
      setState("auth_required");
      return;
    }
    setUpdatingId(task.id);
    const response = await fetch(`/api/treatments/tasks/${task.id}`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        "idempotency-key": `task-update-${crypto.randomUUID()}`,
      },
      body: JSON.stringify({ skipped }),
    }).catch(() => null);
    setUpdatingId(null);
    if (!response?.ok) {
      setState(response?.status === 503 ? "database_unavailable" : "request_failed");
      return;
    }
    await load();
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">Durable task board</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">Treatment tasks</h2>
        </div>
        <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">{state}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-700">{stateCopy(state)}</p>

      <form onSubmit={createTask} className="mt-5 grid gap-4">
        <h3 className="text-base font-semibold text-slate-900">Add a task to a saved plan</h3>
        <label className="grid gap-1 text-sm font-semibold" htmlFor="task-plan">
          Treatment plan
          <select id="task-plan" value={planId} onChange={(event) => setPlanId(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 font-normal">
            <option value="">Select a saved plan</option>
            {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.title} ({plan.status})</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold" htmlFor="task-name">
          Task name
          <input id="task-name" maxLength={200} value={taskName} onChange={(event) => setTaskName(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 font-normal" />
        </label>
        <label className="grid gap-1 text-sm font-semibold" htmlFor="task-due-at">
          Due date and time (optional)
          <input id="task-due-at" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="rounded-md border border-slate-300 px-3 py-2 font-normal" />
        </label>
        <button type="submit" disabled={saving || state !== "ready"} className="w-fit rounded-md border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-500">
          {saving ? "Saving..." : "Save task"}
        </button>
      </form>

      <div className="mt-6 border-t border-slate-200 pt-6">
        <h3 className="text-sm font-semibold text-slate-900">Saved tasks</h3>
        <div className="mt-2 grid gap-2">
          {tasks.length === 0 ? <p className="text-sm text-slate-600">No treatment tasks saved yet.</p> : null}
          {tasks.map((task) => (
            <div key={task.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{task.taskName}</p>
                  <p className="mt-1 text-xs text-slate-600">{task.dueAt ? `Due ${new Date(task.dueAt).toLocaleString()}` : "No due date"}</p>
                </div>
                <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700">{task.completedAt ? "completed" : task.skipped ? "skipped" : "open"}</span>
              </div>
              {!task.completedAt && !task.skipped ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => void updateTask(task, false)} disabled={updatingId === task.id} className="rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">Mark complete</button>
                  <button type="button" onClick={() => void updateTask(task, true)} disabled={updatingId === task.id} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 disabled:opacity-60">Mark skipped</button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
