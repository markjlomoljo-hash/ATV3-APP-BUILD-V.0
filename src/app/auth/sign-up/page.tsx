import { SupabaseSignUpForm } from "@/components/auth/SupabaseSignUpForm";

export const dynamic = "force-dynamic";

export default async function SupabaseSignUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = await searchParams;
  const next = typeof resolved.next === "string" ? resolved.next : undefined;
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10 md:px-8">
      <SupabaseSignUpForm nextPath={next} />
    </main>
  );
}
