"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/acnetrex/StatusPanels";
import {
  deriveModuleLiveStatus,
  parseHealthSnapshot,
  parseProbeBody,
  type DerivedModuleStatus,
  type HealthSnapshot,
  type ModuleProbeOutcome,
} from "@/lib/acnetrex/modules/live-status";

/**
 * Live service/readiness status for a module, derived from real runtime
 * checks (/api/health plus the module's owner-scoped probe endpoint) instead
 * of hardcoded registry values. Modules without a probe render an explicit
 * "not instrumented" state.
 */
export function ModuleLiveStatusPanel({ probePath }: { probePath: string | null }) {
  const [derived, setDerived] = useState<DerivedModuleStatus | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      let health: HealthSnapshot | null = null;
      try {
        const healthResponse = await fetch("/api/health", { cache: "no-store" });
        health = parseHealthSnapshot(await healthResponse.json().catch(() => null));
      } catch {
        health = null;
      }

      let probeOutcome: ModuleProbeOutcome | null = null;
      if (probePath) {
        try {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token ?? null;
          const response = await fetch(probePath, {
            cache: "no-store",
            headers: token ? { authorization: `Bearer ${token}` } : undefined,
          });
          probeOutcome = parseProbeBody(response.status, await response.json().catch(() => null));
        } catch {
          probeOutcome = { kind: "network_error" };
        }
      }

      if (!cancelled) {
        setDerived(deriveModuleLiveStatus({ probePath, probeOutcome, health }));
      }
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, [probePath]);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-950">Live service status</h2>
        {derived ? <StatusBadge status={derived.readinessStatus} /> : null}
      </div>
      {derived === null ? (
        <p className="mt-3 text-sm leading-6 text-slate-600">Running live checks against /api/health{probePath ? ` and ${probePath}` : ""}...</p>
      ) : (
        <div className="mt-3 grid gap-2 text-sm leading-6 text-slate-700">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900">Service</span>
            <StatusBadge status={derived.serviceStatus} />
            <span className="font-semibold text-slate-900">Readiness</span>
            <StatusBadge status={derived.readinessStatus} />
          </div>
          <p>{derived.detail}</p>
          <p className="text-xs leading-5 text-slate-500">
            Source: {derived.source === "probe" ? `live probe (${probePath})` : derived.source === "health" ? "/api/health" : "not instrumented"}
          </p>
        </div>
      )}
    </section>
  );
}
