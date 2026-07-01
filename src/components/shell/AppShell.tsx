"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/client/use-session";
import { api } from "@/lib/client/api";

const NAV = [
  { href: "/tasks", label: "Task Board" },
  { href: "/treatments", label: "Treatment Plans" },
  { href: "/treatments/history", label: "History" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const onLogout = async () => {
    await api.logout();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/tasks" className="flex items-center gap-2 font-semibold text-slate-900">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-sm font-bold text-white">Ax</span>
            <span>
              AcneTrex <span className="text-emerald-700">V3</span>
            </span>
          </Link>
          {!loading && user && (
            <nav className="flex items-center gap-1 text-sm">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-3 py-1.5 font-medium transition ${
                    pathname === item.href ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <button onClick={onLogout} className="ml-2 rounded-full px-3 py-1.5 text-slate-500 hover:bg-slate-100">
                Log out
              </button>
            </nav>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
