import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return <main className="mx-auto max-w-xl p-8"><h1 className="text-2xl font-semibold">Authentication not configured</h1><p className="mt-3 text-slate-600">The Clerk publishable key is missing from this deployment.</p></main>;
  }
  return <main className="flex min-h-[70vh] items-center justify-center p-6"><SignIn /></main>;
}
