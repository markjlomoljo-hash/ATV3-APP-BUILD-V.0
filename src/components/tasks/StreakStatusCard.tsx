export function StreakStatusCard({
  currentStreak,
  longestStreak,
  isFullStreakDay,
  requiredCompleted,
  requiredTotal,
  onOpenRestore,
  restoresRemaining,
}: {
  currentStreak: number;
  longestStreak: number;
  isFullStreakDay: boolean;
  requiredCompleted: number;
  requiredTotal: number;
  onOpenRestore: () => void;
  restoresRemaining: number;
}) {
  const partial = !isFullStreakDay && requiredTotal > 0;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-slate-500">Streak</p>
        {restoresRemaining > 0 && (
          <button onClick={onOpenRestore} className="text-xs font-semibold text-emerald-700 hover:underline">
            Restore a day
          </button>
        )}
      </div>
      <p className="mt-1 text-2xl font-bold text-slate-950">
        {currentStreak} day{currentStreak === 1 ? "" : "s"}
      </p>
      <p className="text-xs text-slate-500">Longest: {longestStreak} days</p>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${isFullStreakDay ? "bg-emerald-500" : "bg-amber-400"}`}
          style={{ width: requiredTotal > 0 ? `${Math.min(100, (requiredCompleted / requiredTotal) * 100)}%` : "0%" }}
        />
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {requiredTotal === 0
          ? "No required tasks yet today."
          : isFullStreakDay
            ? "Today counts as a full streak day."
            : `${requiredCompleted}/${requiredTotal} required tasks done${partial ? " — streak continues once all are complete or queued." : ""}`}
      </p>
    </div>
  );
}
