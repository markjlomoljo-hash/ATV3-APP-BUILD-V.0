import type { ModuleFormField, ModuleIntegrationCheck } from "@/lib/acnetrex/services/module-service";
import { StatusBadge } from "@/components/acnetrex/StatusPanels";

export function ModuleActionCard({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: string;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">Primary workflow</p>
      <h2 className="mt-2 text-xl font-semibold text-slate-950">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-700">{description}</p>
      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
        {action}
      </div>
    </section>
  );
}

export function ModuleReadinessPanel({ checks }: { checks: ModuleIntegrationCheck[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-slate-950">Integration readiness</h2>
      <div className="mt-4 grid gap-3">
        {checks.map((check) => (
          <div key={check.label} className="rounded-lg border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold text-slate-900">{check.label}</p>
              <StatusBadge status={check.status} />
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{check.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ModuleHistoryPanel({ title, emptyState }: { title: string; emptyState: string }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
        {emptyState}
      </div>
    </section>
  );
}

export function ModuleIntegrationStatus({
  endpoint,
  missingDataActions,
  safetyNotes,
}: {
  endpoint?: string;
  missingDataActions: string[];
  safetyNotes: string[];
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-slate-950">Operational boundary</h2>
      {endpoint ? (
        <p className="mt-3 text-sm leading-6 text-slate-700">
          Server boundary: <span className="font-semibold">{endpoint}</span>
        </p>
      ) : (
        <p className="mt-3 text-sm leading-6 text-slate-700">
          This module is prepared for a service adapter and will fail closed until persistence is configured.
        </p>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">Needed next</p>
          <ul className="mt-2 grid gap-2 text-sm leading-6 text-slate-700">
            {missingDataActions.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Safety rules</p>
          <ul className="mt-2 grid gap-2 text-sm leading-6 text-slate-700">
            {safetyNotes.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function renderField(field: ModuleFormField) {
  const id = `module-field-${field.name}`;
  const base =
    "mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm disabled:bg-slate-100";

  if (field.type === "textarea") {
    return <textarea id={id} name={field.name} placeholder={field.placeholder} className={`${base} min-h-24`} />;
  }

  if (field.type === "select") {
    return (
      <select id={id} name={field.name} className={base} defaultValue="">
        <option value="" disabled>
          Select
        </option>
        {(field.options ?? []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label htmlFor={id} className="mt-2 flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
        <input id={id} name={field.name} type="checkbox" className="mt-1 h-4 w-4" />
        <span className="text-sm text-slate-700">{field.help}</span>
      </label>
    );
  }

  return (
    <input
      id={id}
      name={field.name}
      type={field.type}
      required={field.required}
      placeholder={field.placeholder}
      className={base}
    />
  );
}

export function ModuleFormSection({
  title,
  description,
  fields,
}: {
  title: string;
  description: string;
  fields: ModuleFormField[];
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-700">{description}</p>
      <form className="mt-5 grid gap-4">
        {fields.map((field) => (
          <div key={field.name}>
            {field.type !== "checkbox" ? (
              <>
                <label htmlFor={`module-field-${field.name}`} className="text-sm font-semibold text-slate-900">
                  {field.label}
                </label>
                {renderField(field)}
                <p className="mt-1 text-xs leading-5 text-slate-500">{field.help}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-slate-900">{field.label}</p>
                {renderField(field)}
              </>
            )}
          </div>
        ))}
        <button
          type="button"
          className="rounded-md border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700"
          aria-disabled="true"
        >
          Save requires live account persistence
        </button>
      </form>
    </section>
  );
}
