export function TreatmentConflictWarningCard({ flags }: { flags: Array<{ id: string; severity: string; message: string; requiresProviderContact: boolean }> }) {
  const visible = flags.filter((f) => f.severity !== "info");
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {visible.map((f) => (
        <div
          key={f.id}
          className={`rounded-xl border p-3 text-sm ${
            f.severity === "severe" ? "border-rose-300 bg-rose-50 text-rose-800" : "border-amber-300 bg-amber-50 text-amber-800"
          }`}
        >
          <p className="font-semibold">{f.severity === "severe" ? "⚠️ Needs provider attention" : "Possible conflict"}</p>
          <p>{f.message}</p>
          {f.requiresProviderContact && <p className="mt-1 font-medium">Please contact your dermatologist or prescriber before making changes.</p>}
        </div>
      ))}
    </div>
  );
}
