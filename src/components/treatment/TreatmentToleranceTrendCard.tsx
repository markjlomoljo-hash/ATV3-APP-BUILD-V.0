const IRRITATION_WEIGHT: Record<string, number> = { none: 0, mild: 1, moderate: 2, severe: 3 };

export function TreatmentToleranceTrendCard({ checkins }: { checkins: Array<{ checkinDate: string; irritationLevel: string; usageStatus: string }> }) {
  if (checkins.length === 0) {
    return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Insufficient data — log a few check-ins to see a tolerance trend.</div>;
  }

  const sorted = [...checkins].sort((a, b) => a.checkinDate.localeCompare(b.checkinDate)).slice(-14);
  const usedCount = sorted.filter((c) => c.usageStatus === "used").length;
  const adherenceRate = Math.round((usedCount / sorted.length) * 100);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">Tolerance & adherence (last {sorted.length} check-ins)</p>
      <p className="mt-1 text-sm text-slate-700">Adherence rate: {adherenceRate}% used as planned</p>
      <div className="mt-3 flex items-end gap-1">
        {sorted.map((c) => (
          <div key={c.checkinDate} title={`${c.checkinDate}: ${c.irritationLevel} irritation`} className="flex flex-col items-center gap-1">
            <div
              className={`w-4 rounded-t ${c.irritationLevel === "severe" ? "bg-rose-500" : c.irritationLevel === "moderate" ? "bg-amber-400" : c.irritationLevel === "mild" ? "bg-amber-200" : "bg-emerald-300"}`}
              style={{ height: `${8 + IRRITATION_WEIGHT[c.irritationLevel] * 10}px` }}
            />
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">This reflects logged irritation levels only — it is not a diagnosis or a guarantee of improvement.</p>
    </div>
  );
}
