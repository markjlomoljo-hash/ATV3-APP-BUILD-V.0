export function BadgeShelf({ badges }: { badges: Array<{ id: string; name: string; description: string; icon: string; unlocked: boolean }> }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">Badges</p>
      <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7">
        {badges.map((b) => (
          <div
            key={b.id}
            title={`${b.name}: ${b.description}${b.unlocked ? "" : " (locked — keep contributing real data to unlock)"}`}
            className={`grid aspect-square place-items-center rounded-xl border text-2xl ${
              b.unlocked ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50 opacity-40 grayscale"
            }`}
          >
            {b.icon}
          </div>
        ))}
      </div>
    </div>
  );
}
