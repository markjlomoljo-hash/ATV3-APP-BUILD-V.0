"use client";

import { useState } from "react";

export function StreakRestoreModal({
  onClose,
  onConfirm,
  restoresRemaining,
  candidateDates,
}: {
  onClose: () => void;
  onConfirm: (date: string) => Promise<void>;
  restoresRemaining: number;
  candidateDates: string[];
}) {
  const [selected, setSelected] = useState(candidateDates[0] ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-slate-950">Restore a streak day</h2>
        <p className="mt-2 text-sm text-slate-600">
          Restoring only fixes your motivational streak count — it never fills in missing health data. You have{" "}
          <strong>{restoresRemaining}</strong> restore{restoresRemaining === 1 ? "" : "s"} left this calendar month.
        </p>
        {candidateDates.length === 0 ? (
          <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">No recent missed days are eligible for restore.</p>
        ) : (
          <select value={selected} onChange={(e) => setSelected(e.target.value)} className="mt-4 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
            {candidateDates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        )}
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button
            disabled={busy || !selected}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await onConfirm(selected);
                onClose();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Restore failed.");
              } finally {
                setBusy(false);
              }
            }}
            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? "Restoring…" : "Restore"}
          </button>
        </div>
      </div>
    </div>
  );
}
