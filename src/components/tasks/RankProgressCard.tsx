export function RankProgressCard({
  currentRankName,
  nextRankName,
  totalPoints,
  nextRankMinPoints,
}: {
  currentRankName: string;
  nextRankName: string | null;
  totalPoints: number;
  nextRankMinPoints: number | null;
}) {
  const progress = nextRankMinPoints ? Math.min(100, (totalPoints / nextRankMinPoints) * 100) : 100;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">Rank</p>
      <p className="mt-1 text-lg font-bold text-slate-950">{currentRankName}</p>
      {nextRankName ? (
        <>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {totalPoints}/{nextRankMinPoints} pts toward {nextRankName}
          </p>
        </>
      ) : (
        <p className="mt-1 text-xs text-slate-500">You've reached the top rank for personal AI/ML readiness.</p>
      )}
    </div>
  );
}
