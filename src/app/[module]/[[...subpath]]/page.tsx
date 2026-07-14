import { notFound } from "next/navigation";
import { ModulePage } from "@/components/acnetrex/ModulePage";
import { getModuleByPath } from "@/lib/acnetrex/modules/module-registry";

export const dynamic = "force-dynamic";

export default async function AcneTrexModuleRoute({
  params,
}: {
  params: Promise<{ module: string; subpath?: string[] }>;
}) {
  const resolved = await params;
  const path = `/${[resolved.module, ...(resolved.subpath ?? [])].join("/")}`;
  const moduleConfig = getModuleByPath(path);

  if (!moduleConfig) {
    notFound();
  }

  return <ModulePage module={moduleConfig} />;
}
