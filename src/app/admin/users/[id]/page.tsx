import { AdminSectionPanel } from "@/components/admin/AdminPanels";

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminSectionPanel title="User detail" description="Account-level operational data only. Sensitive health records remain behind audited break-glass access." endpoint={`/api/admin/users/${encodeURIComponent(id)}`} />;
}
