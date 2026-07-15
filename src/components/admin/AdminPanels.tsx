"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

async function adminFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  if (data.session?.access_token) headers.set("authorization", `Bearer ${data.session.access_token}`);
  return fetch(input, { ...init, headers, credentials: "same-origin" });
}

type ApiPayload = {
  ok: boolean;
  error?: string;
  data?: Record<string, unknown>;
  viewer?: { role?: string; roleVersion?: number; roleSource?: string; permissions?: string[] };
};

function displayValue(value: unknown): string {
  if (value === null || value === undefined) return "Unavailable";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return JSON.stringify(value);
}

function StatusMessage({ payload }: { payload: ApiPayload | null }) {
  if (!payload || payload.ok) return null;
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950" role="alert">
      Data is unavailable: <span className="font-semibold">{payload.error ?? "unexpected_response"}</span>
    </div>
  );
}

function MetricGrid({ metrics }: { metrics: Record<string, unknown> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Object.entries(metrics).map(([key, raw]) => {
        const value = typeof raw === "object" && raw !== null && "value" in raw ? raw.value : raw;
        const status = typeof raw === "object" && raw !== null && "status" in raw ? String(raw.status) : "ready";
        const detail = typeof raw === "object" && raw !== null && "detail" in raw ? String(raw.detail) : null;
        return (
          <article key={key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{key.replaceAll(/([A-Z])/g, " $1")}</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{displayValue(value)}</p>
            <p className="mt-1 text-xs text-slate-500">{status}{detail ? ` — ${detail}` : ""}</p>
          </article>
        );
      })}
    </div>
  );
}

function ObjectTable({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <tbody className="divide-y divide-slate-200">
          {Object.entries(data).map(([key, value]) => (
            <tr key={key}>
              <th className="w-64 px-4 py-3 font-semibold text-slate-700">{key}</th>
              <td className="px-4 py-3 text-slate-600">
                {Array.isArray(value) || (typeof value === "object" && value !== null)
                  ? <pre className="max-w-4xl overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(value, null, 2)}</pre>
                  : displayValue(value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function useAdminData(endpoint: string) {
  const [state, setState] = useState<{ requestKey: string; payload: ApiPayload } | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const requestKey = `${endpoint}:${refreshVersion}`;
  const refresh = useCallback(async () => {
    setRefreshVersion((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void adminFetch(endpoint, { cache: "no-store" })
      .then(async (response) => response.json().catch(() => ({ ok: false, error: "unexpected_response" })))
      .then((payload: ApiPayload) => { if (!cancelled) setState({ requestKey, payload }); })
      .catch(() => { if (!cancelled) setState({ requestKey, payload: { ok: false, error: "network_unavailable" } }); });
    return () => { cancelled = true; };
  }, [endpoint, requestKey]);
  return { payload: state?.requestKey === requestKey ? state.payload : null, loading: state?.requestKey !== requestKey, refresh };
}

export function AdminOverviewPanel() {
  const { payload, loading, refresh } = useAdminData("/api/admin/overview");
  const [bootstrapResult, setBootstrapResult] = useState<ApiPayload | null>(null);
  const [bootstrapping, setBootstrapping] = useState(false);
  const metrics = payload?.data?.metrics;

  async function finalizeOwner() {
    const reason = window.prompt("Enter the reason for finalizing this bootstrap owner record (10+ characters).");
    if (!reason) return;
    setBootstrapping(true);
    try {
      const response = await adminFetch("/api/admin/roles/bootstrap-owner", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      setBootstrapResult(await response.json() as ApiPayload);
    } catch {
      setBootstrapResult({ ok: false, error: "network_unavailable" });
    } finally {
      setBootstrapping(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div><h1 className="text-3xl font-bold text-slate-950">Operations overview</h1><p className="text-slate-600">Verified identity, presence, queue, and readiness signals.</p></div>
        <button type="button" onClick={() => void refresh()} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Refresh</button>
      </div>
      {loading ? <p className="text-sm text-slate-500">Loading verified metrics…</p> : null}
      <StatusMessage payload={payload} />
      {payload?.viewer?.roleSource === "owner_allowlist" ? (
        <div className="rounded-xl border border-blue-300 bg-blue-50 p-4 text-sm text-blue-950">
          <p className="font-semibold">Bootstrap owner allowlist is active.</p>
          <p className="mt-1">Finalize the owner role in Clerk metadata so authorized navigation and session claims can reflect it. This writes audit evidence and signs this session out.</p>
          <button type="button" disabled={bootstrapping} onClick={() => void finalizeOwner()} className="mt-3 rounded-md bg-blue-950 px-4 py-2 font-semibold text-white disabled:opacity-50">{bootstrapping ? "Finalizing…" : "Finalize owner metadata"}</button>
        </div>
      ) : null}
      {bootstrapResult ? <div className={`rounded-lg border p-4 text-sm ${bootstrapResult.ok ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>{bootstrapResult.ok ? "Owner metadata finalized. Sign in again to refresh the Clerk session." : `Owner bootstrap blocked: ${bootstrapResult.error}`}</div> : null}
      {metrics && typeof metrics === "object" && !Array.isArray(metrics) ? <MetricGrid metrics={metrics as Record<string, unknown>} /> : null}
      {payload?.data?.sources && typeof payload.data.sources === "object" ? <ObjectTable data={payload.data.sources as Record<string, unknown>} /> : null}
    </section>
  );
}

export function AdminSectionPanel({ title, description, endpoint }: { title: string; description: string; endpoint: string }) {
  const { payload, loading, refresh } = useAdminData(endpoint);
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div><h1 className="text-3xl font-bold text-slate-950">{title}</h1><p className="text-slate-600">{description}</p></div>
        <button type="button" onClick={() => void refresh()} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Refresh</button>
      </div>
      {loading ? <p className="text-sm text-slate-500">Loading authorized data…</p> : null}
      <StatusMessage payload={payload} />
      {payload?.data ? <ObjectTable data={payload.data} /> : null}
    </section>
  );
}

type AdminUserRow = {
  id: string;
  email: string | null;
  displayName: string | null;
  role: string;
  status: string;
  verified: boolean;
  githubConnected: boolean;
  lastActiveAt: string | null;
};

export function AdminUsersPanel() {
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const endpoint = useMemo(() => `/api/admin/users?page=1&pageSize=20&search=${encodeURIComponent(submittedSearch)}`, [submittedSearch]);
  const { payload, loading, refresh } = useAdminData(endpoint);
  const users = Array.isArray(payload?.data?.users) ? payload.data.users as AdminUserRow[] : [];

  return (
    <section className="space-y-4">
      <div><h1 className="text-3xl font-bold text-slate-950">Users</h1><p className="text-slate-600">Paginated Clerk identities. Last activity is distinct from last sign-in.</p></div>
      <form onSubmit={(event) => { event.preventDefault(); setSubmittedSearch(search.trim()); }} className="flex gap-2">
        <label className="sr-only" htmlFor="admin-user-search">Search users</label>
        <input id="admin-user-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, email, username, or user ID" className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
        <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Search</button>
        <button type="button" onClick={() => void refresh()} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">Refresh</button>
      </form>
      {loading ? <p className="text-sm text-slate-500">Loading users…</p> : null}
      <StatusMessage payload={payload} />
      {payload?.ok ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">State</th><th className="px-4 py-3">GitHub</th><th className="px-4 py-3">Last active</th></tr></thead>
            <tbody className="divide-y divide-slate-200">{users.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3"><Link className="font-semibold text-blue-700 hover:underline" href={`/admin/users/${user.id}`}>{user.displayName ?? user.email ?? user.id}</Link><div className="text-xs text-slate-500">{user.email ?? user.id}</div></td>
                <td className="px-4 py-3">{user.role}</td><td className="px-4 py-3">{user.status}{user.verified ? " · verified" : " · unverified"}</td><td className="px-4 py-3">{user.githubConnected ? "Connected" : "No"}</td><td className="px-4 py-3">{user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleString() : "Unavailable"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

export function AdminRolesPanel() {
  const catalog = useAdminData("/api/admin/roles");
  const [targetUserId, setTargetUserId] = useState("");
  const [targetRole, setTargetRole] = useState("user");
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<ApiPayload | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await adminFetch("/api/admin/roles/assign", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetUserId: targetUserId.trim(), targetRole, reason: reason.trim() }),
      });
      setResult(await response.json() as ApiPayload);
    } catch {
      setResult({ ok: false, error: "network_unavailable" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-4">
      <div><h1 className="text-3xl font-bold text-slate-950">Roles</h1><p className="text-slate-600">Clerk metadata roles with versioning, audit evidence, owner protection, and stale-session revocation.</p></div>
      <StatusMessage payload={catalog.payload} />
      {catalog.payload?.data ? <ObjectTable data={catalog.payload.data} /> : null}
      <form onSubmit={submit} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 md:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">Clerk user ID<input required value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" placeholder="user_…" /></label>
        <label className="text-sm font-semibold text-slate-700">Role<select value={targetRole} onChange={(event) => setTargetRole(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal"><option>user</option><option>support</option><option>moderator</option><option>analyst</option><option>clinical_reviewer</option><option>admin</option><option>owner</option></select></label>
        <label className="text-sm font-semibold text-slate-700 md:col-span-2">Reason<textarea required minLength={3} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 font-normal" /></label>
        <div className="md:col-span-2"><button disabled={submitting} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{submitting ? "Applying…" : "Assign role"}</button></div>
      </form>
      {result ? <div className={`rounded-lg border p-4 text-sm ${result.ok ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>{result.ok ? "Role updated and stale sessions revoked." : `Role update blocked: ${result.error}`}</div> : null}
    </section>
  );
}
