import { SupabaseSignInForm } from "@/components/auth/SupabaseSignInForm";

export const dynamic = "force-dynamic";

export default async function SupabaseSignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = await searchParams;
  const next = typeof resolved.next === "string" ? resolved.next : undefined;
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10 md:px-8">
      <SupabaseSignInForm nextPath={next} />
    </main>
  );
}
