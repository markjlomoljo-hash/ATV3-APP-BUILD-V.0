export function SupabaseAuthNotConfigured() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h1 className="text-2xl font-semibold text-slate-950">App sign-in not configured</h1>
      <p className="mt-3 text-sm leading-6 text-slate-700">
        Supabase authentication is not configured for this deployment. Set{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>{" "}
        (or <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>) to
        enable it. No sign-in or account creation is possible until then.
      </p>
    </section>
  );
}
