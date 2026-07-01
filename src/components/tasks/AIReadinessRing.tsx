export function AIReadinessRing({ requiredCompleted, requiredTotal, optionalCompleted, optionalTotal }: { requiredCompleted: number; requiredTotal: number; optionalCompleted: number; optionalTotal: number }) {
  const total = requiredTotal + optionalTotal;
  const completed = requiredCompleted + optionalCompleted;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const circumference = 2 * Math.PI * 26;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden>
        <circle cx="32" cy="32" r="26" fill="none" stroke="#e2e8f0" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          stroke="#059669"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 32 32)"
        />
        <text x="32" y="37" textAnchor="middle" fontSize="14" fontWeight="700" fill="#0f172a">
          {pct}%
        </text>
      </svg>
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">AI Readiness Today</p>
        <p className="text-xs text-slate-500">{completed}/{total || 0} tasks feeding the models</p>
      </div>
    </div>
  );
}
