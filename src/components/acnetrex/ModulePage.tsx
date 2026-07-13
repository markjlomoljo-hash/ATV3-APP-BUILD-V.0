import Link from "next/link";
import type { AcneTrexModule } from "@/lib/acnetrex/modules/module-registry";
import { ACNETREX_MODULES, modulesByCategory } from "@/lib/acnetrex/modules/module-registry";
import { buildModuleReadinessIssues } from "@/lib/acnetrex/modules/readiness";
import { buildModuleWorkflow } from "@/lib/acnetrex/services/module-service";
import {
  ModuleActionCard,
  ModuleFormSection,
  ModuleHistoryPanel,
  ModuleIntegrationStatus,
  ModuleReadinessPanel,
} from "@/components/acnetrex/ModuleLayout";
import { HonestStatePanel, MedicalSafetyNotice, StatusBadge } from "@/components/acnetrex/StatusPanels";
import { CutisAiConversationPanel } from "@/components/acnetrex/CutisAiConversationPanel";

function ModuleCard({ module }: { module: AcneTrexModule }) {
  return (
    <Link
      href={module.route}
      className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-400 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{module.category}</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-950">{module.name}</h3>
        </div>
        <StatusBadge status={module.readinessStatus} />
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-700">{module.description}</p>
      <p className="mt-4 text-xs font-medium text-slate-500">Next: {module.nextAction}</p>
    </Link>
  );
}

export function DashboardHome() {
  const categories = modulesByCategory();

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 md:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">AcneTrex V3</p>
          <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_320px] lg:items-end">
            <div>
              <h1 className="text-4xl font-semibold tracking-normal text-slate-950">Acne intelligence workspace</h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
                A mobile-first product shell for logging, FaceAtlas capture, Skin Twin scenarios, AI/ML readiness,
                CutisAI, reports, treatment tasks, privacy controls, and native-device readiness. Live services remain
                fail-closed until Supabase, Cloud Run, Vertex, and device credentials are verified.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Production posture</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                No scores, predictions, reports, streaks, or assistant claims are fabricated. Unavailable services are
                surfaced as explicit readiness states.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <MedicalSafetyNotice />
        </div>

        <div className="mt-8 grid gap-8">
          {(Object.keys(categories) as Array<keyof typeof categories>).map((category) => (
            <section key={category}>
              <div className="mb-3 flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-slate-950">{category}</h2>
                <span className="text-sm text-slate-500">{categories[category].length} modules</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {categories[category].map((module) => (
                  <ModuleCard key={module.id} module={module} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}

export function ModulePage({ module }: { module: AcneTrexModule }) {
  const issues = buildModuleReadinessIssues(module);
  const workflow = buildModuleWorkflow(module);
  const related = ACNETREX_MODULES.filter(
    (candidate) => candidate.category === module.category && candidate.id !== module.id,
  ).slice(0, 4);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 md:px-8">
      <section className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm font-semibold text-slate-600 hover:text-slate-950">
          Back to dashboard
        </Link>

        <header className="mt-4 rounded-lg bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">{module.category}</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-normal text-slate-950">{module.name}</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700">{module.description}</p>
            </div>
            <div className="flex flex-col items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <StatusBadge status={module.readinessStatus} />
              <span className="text-xs font-medium text-slate-500">Priority {module.prdPriority}</span>
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_340px]">
          <section className="grid gap-4">
            <MedicalSafetyNotice />

            {module.id === "cutisai" ? (
              <CutisAiConversationPanel />
            ) : (
              <>
                <ModuleActionCard
                  title={workflow.formTitle}
                  description={workflow.formDescription}
                  action={workflow.primaryAction}
                />

                <ModuleFormSection
                  title={workflow.formTitle}
                  description={workflow.formDescription}
                  fields={workflow.fields}
                />
              </>
            )}

            <ModuleReadinessPanel checks={workflow.integrationChecks} />

            <ModuleReadinessPanel title="Local capability contract" checks={workflow.capabilityCards} />

            <ModuleHistoryPanel title={workflow.historyTitle} emptyState={workflow.historyEmptyState} />

            <HonestStatePanel status={module.serviceStatus} title="Service boundary">
              <p>
                This module is present, typed, and routed. It will use its service adapter and persistence contract when
                live credentials are available. Until then, the app must show this explicit state instead of a fake
                success result.
              </p>
            </HonestStatePanel>

            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-semibold">Module contract</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Tables</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {module.dataTables.length > 0 ? module.dataTables.join(", ") : "No table required yet"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Private storage</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {module.storageBuckets.length > 0 ? module.storageBuckets.join(", ") : "No storage bucket required"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Consent scopes</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {module.requiresConsentScopes.length > 0
                      ? module.requiresConsentScopes.join(", ")
                      : "No special scope beyond account privacy defaults"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Implemented surfaces</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{module.implementedSurfaces.join(", ")}</p>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-semibold">Readiness checks</h2>
              <div className="mt-4 grid gap-3">
                {issues.map((issue) => (
                  <div key={`${issue.label}-${issue.status}`} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-semibold text-slate-900">{issue.label}</p>
                      <StatusBadge status={issue.status} />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{issue.detail}</p>
                  </div>
                ))}
              </div>
            </section>

            <ModuleIntegrationStatus
              endpoint={workflow.serviceEndpoint}
              missingDataActions={workflow.missingDataActions}
              safetyNotes={workflow.safetyNotes}
            />
          </section>

          <aside className="grid content-start gap-4">
            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-semibold">Next implementation action</h2>
              <p className="mt-3 text-sm leading-6 text-slate-700">{module.nextAction}</p>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-semibold">Remaining blockers</h2>
              <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-700">
                {module.missingSurfaces.map((surface) => (
                  <li key={surface}>- {surface}</li>
                ))}
              </ul>
            </section>

            {related.length > 0 ? (
              <section className="rounded-lg border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-semibold">Related modules</h2>
                <div className="mt-3 grid gap-2">
                  {related.map((item) => (
                    <Link key={item.id} href={item.route} className="text-sm font-semibold text-slate-600 hover:text-slate-950">
                      {item.name}
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </aside>
        </div>
      </section>
    </main>
  );
}
