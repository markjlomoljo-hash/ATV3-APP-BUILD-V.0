const STAGE_EMOJI: Record<string, string> = {
  seed_signal: "🌱",
  calibration_sprout: "🌿",
  data_bloom: "🌸",
  pattern_sentinel: "🦋",
  cutis_guardian: "🛡️",
  atlas_prime: "✨",
};

export function StreakPetAvatar({
  stageCode,
  stageName,
  growthScore,
  nextStageName,
  growthNeeded,
}: {
  stageCode: string;
  stageName: string;
  growthScore: number;
  nextStageName?: string | null;
  growthNeeded?: number | null;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-white p-4 text-center">
      <p className="text-xs uppercase tracking-wide text-slate-500">Data Companion</p>
      <div className="mt-2 text-5xl" aria-hidden>
        {STAGE_EMOJI[stageCode] ?? "🌱"}
      </div>
      <p className="mt-2 text-sm font-bold text-slate-900">{stageName}</p>
      <p className="text-xs text-slate-500">Growth score: {growthScore} (from real data consistency, not skin outcomes)</p>
      {nextStageName && (
        <p className="mt-1 text-xs text-emerald-700">{growthNeeded} more growth points to reach {nextStageName}</p>
      )}
    </div>
  );
}
