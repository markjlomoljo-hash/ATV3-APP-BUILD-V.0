export function PointsLedgerSummary({ totalPoints, todayEarned }: { totalPoints: number; todayEarned: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">Points</p>
      <p className="mt-1 text-2xl font-bold text-slate-950">{totalPoints.toLocaleString()}</p>
      <p className="mt-1 text-xs text-slate-500">+{todayEarned} earned today from real completions</p>
    </div>
  );
}
