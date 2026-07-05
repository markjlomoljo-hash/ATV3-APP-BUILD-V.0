import type { ModuleReadiness } from "@/lib/acnetrex/module-result";

const labels: Record<ModuleReadiness, string> = {
  ready: "Ready",
  insufficient_data: "Insufficient data",
  not_configured: "Not configured",
  auth_required: "Auth required",
  consent_required: "Consent required",
  database_unavailable: "Database unavailable",
  ml_unavailable: "ML unavailable",
  evidence_unavailable: "Evidence unavailable",
  queued_for_cloud: "Queued for cloud",
  error_retry_needed: "Retry needed",
};

const classes: Record<ModuleReadiness, string> = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-800",
  insufficient_data: "border-amber-200 bg-amber-50 text-amber-900",
  not_configured: "border-slate-200 bg-slate-100 text-slate-700",
  auth_required: "border-sky-200 bg-sky-50 text-sky-800",
  consent_required: "border-violet-200 bg-violet-50 text-violet-800",
  database_unavailable: "border-rose-200 bg-rose-50 text-rose-800",
  ml_unavailable: "border-rose-200 bg-rose-50 text-rose-800",
  evidence_unavailable: "border-amber-200 bg-amber-50 text-amber-900",
  queued_for_cloud: "border-cyan-200 bg-cyan-50 text-cyan-800",
  error_retry_needed: "border-rose-200 bg-rose-50 text-rose-800",
};

export function StatusBadge({ status }: { status: ModuleReadiness }) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${classes[status]}`}>
      {labels[status]}
    </span>
  );
}

export function MedicalSafetyNotice() {
  return (
    <aside className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
      AcneTrex supports tracking, pattern review, and preparation for provider conversations. It does not diagnose,
      prescribe, or replace professional medical care.
    </aside>
  );
}

export function HonestStatePanel({
  status,
  title,
  children,
}: {
  status: ModuleReadiness;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-lg border p-4 ${classes[status]}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        <StatusBadge status={status} />
      </div>
      <div className="mt-3 text-sm leading-6">{children}</div>
    </section>
  );
}
