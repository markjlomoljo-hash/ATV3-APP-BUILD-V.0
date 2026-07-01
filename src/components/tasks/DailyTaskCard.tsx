"use client";

import { useState } from "react";
import { TaskReasonLabel } from "./TaskReasonLabel";
import { TaskCompletionAnimation } from "./TaskCompletionAnimation";

export type TaskRow = {
  id: string;
  category: string;
  title: string;
  description: string;
  reason: string;
  points: number;
  requiredForStreak: boolean;
  status: "pending" | "completed" | "skipped" | "expired";
};

const CATEGORY_ICON: Record<string, string> = {
  logging: "📝",
  scan: "🔬",
  treatment: "💊",
  consent: "🔒",
  feedback: "🧠",
  backfill: "🌱",
};

export function DailyTaskCard({
  task,
  onComplete,
  queuedOffline,
  errorMessage,
}: {
  task: TaskRow;
  onComplete: (taskId: string) => Promise<void>;
  queuedOffline?: boolean;
  errorMessage?: string;
}) {
  const [showAnimation, setShowAnimation] = useState(false);
  const [busy, setBusy] = useState(false);
  const completed = task.status === "completed";

  const handleClick = async () => {
    if (completed || busy) return;
    setBusy(true);
    try {
      await onComplete(task.id);
      setShowAnimation(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl border p-4 transition ${completed ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}>
      {showAnimation && <TaskCompletionAnimation points={task.points} onDone={() => setShowAnimation(false)} />}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-xl" aria-hidden>
            {CATEGORY_ICON[task.category] ?? "✅"}
          </span>
          <div>
            <p className="font-semibold text-slate-900">{task.title}</p>
            <p className="text-sm text-slate-600">{task.description}</p>
            <TaskReasonLabel reason={task.reason} />
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">+{task.points} pts</span>
              {task.requiredForStreak && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">Required for streak</span>}
              {queuedOffline && <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-medium text-indigo-700">Queued offline — will sync</span>}
              {errorMessage && <span className="rounded-full bg-rose-100 px-2 py-0.5 font-medium text-rose-700">{errorMessage}</span>}
            </div>
          </div>
        </div>
        <button
          onClick={handleClick}
          disabled={completed || busy}
          aria-pressed={completed}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
            completed ? "bg-emerald-600 text-white" : "bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-60"
          }`}
        >
          {completed ? "Done ✓" : busy ? "Saving…" : "Complete"}
        </button>
      </div>
    </div>
  );
}
