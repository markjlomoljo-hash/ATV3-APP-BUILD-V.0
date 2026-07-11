"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/client/use-session";

export default function HomePage() {
  const { user, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/tasks");
  }, [loading, user, router]);

  return (
    <section className="mx-auto mt-10 max-w-2xl rounded-3xl bg-white p-10 shadow-[0_24px_60px_rgba(16,24,40,0.08)]">
      <p className="m-0 text-sm uppercase tracking-[0.08em] text-emerald-700">AcneTrex V3 — Phase 6</p>
      <h1 className="mt-4 text-[clamp(1.8rem,4vw,2.75rem)] font-semibold leading-tight text-slate-950">
        Task Board & Treatment Plan Center
      </h1>
      <p className="mt-4 text-base text-slate-700">
        Daily tasks turn real missing logs, scan freshness, and treatment schedules into clear next steps. Points,
        streaks, badges, and your streak pet reflect data consistency and AI readiness — never guaranteed skin
        improvement. When data is missing, we say so honestly instead of guessing.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/login" className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
          Log in
        </Link>
        <Link href="/register" className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Create account
        </Link>
      </div>
    </section>
  );
}
