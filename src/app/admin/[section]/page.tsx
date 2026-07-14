import { notFound } from "next/navigation";
import { AdminSectionPanel } from "@/components/admin/AdminPanels";

const SECTIONS: Record<string, { title: string; description: string; endpoint: string }> = {
  analytics: { title: "Analytics", description: "Aggregate operational activity without record-level health exports.", endpoint: "/api/admin/analytics" },
  system: { title: "System", description: "Application and provider readiness from configured adapters.", endpoint: "/api/admin/system/health" },
  database: { title: "Database", description: "Read-only connectivity, schema, and RLS posture. Browser SQL is disabled.", endpoint: "/api/admin/database/status" },
  deployments: { title: "Deployments", description: "Deployment state from server-side provider adapters.", endpoint: "/api/admin/deployments" },
  ml: { title: "ML operations", description: "Cloud inference telemetry and honest unavailable states.", endpoint: "/api/admin/ml/status" },
  models: { title: "Models", description: "Owner-controlled model registry and rollback state.", endpoint: "/api/admin/ml/models" },
  jobs: { title: "Jobs", description: "Report job status without report contents.", endpoint: "/api/admin/jobs" },
  reports: { title: "Reports", description: "Report operations and review workflows.", endpoint: "/api/admin/reports" },
  privacy: { title: "Privacy", description: "Export and deletion request status with audited processing boundaries.", endpoint: "/api/admin/privacy/requests" },
  research: { title: "Research", description: "Aggregate research-consent operations.", endpoint: "/api/admin/research" },
  notifications: { title: "Notifications", description: "Notification operations; no provider secrets are exposed.", endpoint: "/api/admin/notifications" },
  "feature-flags": { title: "Feature flags", description: "Persisted feature controls with permission-gated writes.", endpoint: "/api/admin/feature-flags" },
  security: { title: "Security", description: "Security posture, alerts, and access controls.", endpoint: "/api/admin/security" },
  audit: { title: "Audit", description: "Append-only privileged action evidence with sensitive metadata excluded.", endpoint: "/api/admin/audit" },
  support: { title: "Support", description: "Support cases and non-sensitive identity summaries.", endpoint: "/api/admin/support" },
  moderation: { title: "Moderation", description: "Explicitly reported content and policy workflows only.", endpoint: "/api/admin/moderation" },
  clinical: { title: "Clinical review", description: "Assigned, de-identified safety and evidence review queues.", endpoint: "/api/admin/clinical" },
};

export function generateStaticParams() {
  return Object.keys(SECTIONS).map((section) => ({ section }));
}

export default async function AdminSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const config = SECTIONS[section];
  if (!config) notFound();
  return <AdminSectionPanel {...config} />;
}
