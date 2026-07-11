const DAY_TYPE_STYLE: Record<string, string> = {
  active: "bg-emerald-500 text-white",
  rest: "bg-slate-200 text-slate-600",
  review: "bg-indigo-500 text-white",
  provider_check: "bg-rose-500 text-white",
};

const DAY_TYPE_LABEL: Record<string, string> = {
  active: "Active",
  rest: "Rest",
  review: "Review",
  provider_check: "Provider check",
};

export function TreatmentScheduleCalendar({ days }: { days: Array<{ scheduledDate: string; dayType: string; instructions: string | null }> }) {
  if (days.length === 0) {
    return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No schedule generated yet.</div>;
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap gap-1.5">
        {days.map((d) => (
          <div key={d.scheduledDate} title={`${d.scheduledDate} — ${DAY_TYPE_LABEL[d.dayType] ?? d.dayType}${d.instructions ? `: ${d.instructions}` : ""}`} className="flex flex-col items-center">
            <span className={`grid h-8 w-10 place-items-center rounded-md text-[10px] font-semibold ${DAY_TYPE_STYLE[d.dayType] ?? "bg-slate-100 text-slate-500"}`}>
              {d.scheduledDate.slice(8, 10)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
        {Object.entries(DAY_TYPE_LABEL).map(([key, label]) => (
          <span key={key} className="flex items-center gap-1">
            <span className={`h-2.5 w-2.5 rounded-full ${DAY_TYPE_STYLE[key]}`} /> {label}
          </span>
        ))}
      </div>
    </div>
  );
}
