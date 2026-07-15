import Link from "next/link";
import { ReactNode } from "react";
import { hasPermission } from "@/lib/auth/authorization";
import type { AppPermission } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

const NAV: Array<{ href: string; label: string; permissions: AppPermission[] }> = [
  { href: "/admin", label: "Overview", permissions: ["admin:access", "admin:access_limited"] },
  { href: "/admin/users", label: "Users", permissions: ["users:read", "users:read_limited", "users:read_support"] },
  { href: "/admin/roles", label: "Roles", permissions: ["roles:read"] },
  { href: "/admin/analytics", label: "Analytics", permissions: ["analytics:read", "analytics:read_aggregate"] },
  { href: "/admin/system", label: "System", permissions: ["health:read"] },
  { href: "/admin/database", label: "Database", permissions: ["database:read"] },
  { href: "/admin/deployments", label: "Deployments", permissions: ["deployments:read"] },
  { href: "/admin/ml", label: "ML", permissions: ["ml:read"] },
  { href: "/admin/models", label: "Models", permissions: ["ml:read"] },
  { href: "/admin/jobs", label: "Jobs", permissions: ["jobs:read"] },
  { href: "/admin/reports", label: "Reports", permissions: ["reports:manage"] },
  { href: "/admin/privacy", label: "Privacy", permissions: ["deletions:manage", "deletions:read_status"] },
  { href: "/admin/research", label: "Research", permissions: ["research:manage", "research:read_aggregate"] },
  { href: "/admin/notifications", label: "Notifications", permissions: ["notifications:manage"] },
  { href: "/admin/feature-flags", label: "Feature flags", permissions: ["feature_flags:read"] },
  { href: "/admin/security", label: "Security", permissions: ["security:read"] },
  { href: "/admin/audit", label: "Audit", permissions: ["audit:read"] },
  { href: "/admin/support", label: "Support", permissions: ["support:read"] },
  { href: "/admin/moderation", label: "Moderation", permissions: ["moderation:read"] },
  { href: "/admin/clinical", label: "Clinical", permissions: ["clinical_cases:read"] },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const navigation = NAV;
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto grid max-w-[1600px] gap-6 px-4 py-6 lg:grid-cols-[240px_minmax(0,1fr)] md:px-8">
        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Admin Control Center</p>
          <p className="mt-1 text-sm text-slate-700">Supabase Auth · RBAC protected</p>
          <nav className="mt-4 grid grid-cols-2 gap-1 lg:grid-cols-1" aria-label="Admin sections">
            {navigation.map((item) => <Link key={item.href} href={item.href} className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">{item.label}</Link>)}
          </nav>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
