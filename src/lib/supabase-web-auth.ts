// Session helpers for the user-facing Supabase auth flow on web.
//
// The web app deliberately runs dual auth: Clerk guards admin/RBAC pages, while
// every acnetrex data API verifies a Supabase bearer token. These helpers back
// the browser sign-in/sign-up/sign-out flow that actually creates the Supabase
// session the workflow panels read via `supabase.auth.getSession()`.
//
// Every helper fails closed: missing configuration is reported as
// `not configured`, and transport failures surface as `request_failed` —
// no state is ever fabricated as a success.

export type SupabaseWebAuthConfig = {
  url: string;
  publishableKey: string;
};

/**
 * Resolve the browser-safe Supabase configuration from an env record.
 * Mirrors the fallback chain in `src/integrations/supabase/client.ts` so the
 * "configured" answer never disagrees with whether the browser client can
 * actually initialize. Secret keys are refused, exactly like the client.
 */
export function readSupabaseWebAuthConfig(
  env: Record<string, string | undefined>,
): SupabaseWebAuthConfig | null {
  const url = env.VITE_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL;
  const publishableKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    env.VITE_SUPABASE_ANON_KEY ??
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey || publishableKey.startsWith("sb_secret_")) return null;
  return { url, publishableKey };
}

function collectRuntimeEnv(): Record<string, string | undefined> {
  const importMetaEnv =
    (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
  // Exact static `process.env.NEXT_PUBLIC_*` references are required so Next
  // inlines them into client bundles.
  return {
    VITE_SUPABASE_URL: importMetaEnv.VITE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY:
      importMetaEnv.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    VITE_SUPABASE_ANON_KEY:
      importMetaEnv.VITE_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
  };
}

export function supabaseWebAuthConfig(): SupabaseWebAuthConfig | null {
  return readSupabaseWebAuthConfig(collectRuntimeEnv());
}

export function isSupabaseWebAuthConfigured(): boolean {
  return supabaseWebAuthConfig() !== null;
}

// ---------------------------------------------------------------------------
// Input validation — same rules and copy as the mobile email/password flow
// (apps/mobile/app/auth/sign-in.tsx and sign-up.tsx).
// ---------------------------------------------------------------------------

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export type SignInFieldErrors = Partial<Record<"email" | "password", string>>;
export type SignUpFieldErrors = Partial<Record<"email" | "password" | "confirmPassword", string>>;

export type SignInValidation =
  | { ok: true; email: string; password: string }
  | { ok: false; fieldErrors: SignInFieldErrors };

export function validateSignInInput(input: { email: string; password: string }): SignInValidation {
  const fieldErrors: SignInFieldErrors = {};
  const email = normalizeEmail(input.email);
  if (!EMAIL_PATTERN.test(email)) fieldErrors.email = "Enter a valid email address";
  if (input.password.length < 8) fieldErrors.password = "Password must be at least 8 characters";
  if (fieldErrors.email || fieldErrors.password) return { ok: false, fieldErrors };
  return { ok: true, email, password: input.password };
}

export type SignUpValidation =
  | { ok: true; email: string; password: string }
  | { ok: false; fieldErrors: SignUpFieldErrors };

export function validateSignUpInput(input: {
  email: string;
  password: string;
  confirmPassword: string;
}): SignUpValidation {
  const fieldErrors: SignUpFieldErrors = {};
  const email = normalizeEmail(input.email);
  if (!EMAIL_PATTERN.test(email)) fieldErrors.email = "Enter a valid email address";
  if (input.password.length < 8) {
    fieldErrors.password = "Password must be at least 8 characters";
  } else if (!/[A-Z]/.test(input.password)) {
    fieldErrors.password = "Must contain at least one uppercase letter";
  } else if (!/[0-9]/.test(input.password)) {
    fieldErrors.password = "Must contain at least one number";
  }
  if (input.password !== input.confirmPassword) {
    fieldErrors.confirmPassword = "Passwords do not match";
  }
  if (fieldErrors.email || fieldErrors.password || fieldErrors.confirmPassword) {
    return { ok: false, fieldErrors };
  }
  return { ok: true, email, password: input.password };
}

// ---------------------------------------------------------------------------
// Supabase auth error copy — same mapping the mobile app applies.
// ---------------------------------------------------------------------------

export function signInErrorMessage(raw: string): string {
  if (raw.includes("Invalid login credentials")) {
    return "Incorrect email or password. Please try again.";
  }
  if (raw.includes("Email not confirmed")) {
    return "Please confirm your email address before signing in.";
  }
  return raw;
}

export function signUpErrorMessage(raw: string): string {
  if (raw.includes("already registered")) {
    return "An account with this email already exists. Please sign in instead.";
  }
  return raw;
}

// ---------------------------------------------------------------------------
// Auth operations. The Supabase auth client is injected so the outcomes are
// unit-testable without a live project; `supabase.auth` satisfies this shape.
// ---------------------------------------------------------------------------

type AuthErrorLike = { message: string } | null;

export type SupabaseAuthLike = {
  signInWithPassword(credentials: {
    email: string;
    password: string;
  }): Promise<{ error: AuthErrorLike }>;
  signUp(credentials: {
    email: string;
    password: string;
    options?: { emailRedirectTo?: string };
  }): Promise<{ data: { session: unknown | null } | null; error: AuthErrorLike }>;
  signOut(): Promise<{ error: AuthErrorLike }>;
};

export type SignInOutcome =
  | { status: "signed_in" }
  | { status: "invalid"; fieldErrors: SignInFieldErrors }
  | { status: "auth_failed"; message: string }
  | { status: "request_failed" };

export async function performPasswordSignIn(
  auth: Pick<SupabaseAuthLike, "signInWithPassword">,
  input: { email: string; password: string },
): Promise<SignInOutcome> {
  const validated = validateSignInInput(input);
  if (!validated.ok) return { status: "invalid", fieldErrors: validated.fieldErrors };
  try {
    const { error } = await auth.signInWithPassword({
      email: validated.email,
      password: validated.password,
    });
    if (error) return { status: "auth_failed", message: signInErrorMessage(error.message) };
    return { status: "signed_in" };
  } catch {
    return { status: "request_failed" };
  }
}

export type SignUpOutcome =
  | { status: "signed_in" }
  | { status: "confirmation_required" }
  | { status: "invalid"; fieldErrors: SignUpFieldErrors }
  | { status: "auth_failed"; message: string }
  | { status: "request_failed" };

export async function performPasswordSignUp(
  auth: Pick<SupabaseAuthLike, "signUp">,
  input: { email: string; password: string; confirmPassword: string },
  options?: { emailRedirectTo?: string },
): Promise<SignUpOutcome> {
  const validated = validateSignUpInput(input);
  if (!validated.ok) return { status: "invalid", fieldErrors: validated.fieldErrors };
  try {
    const { data, error } = await auth.signUp({
      email: validated.email,
      password: validated.password,
      ...(options?.emailRedirectTo ? { options: { emailRedirectTo: options.emailRedirectTo } } : {}),
    });
    if (error) return { status: "auth_failed", message: signUpErrorMessage(error.message) };
    // Only report an active session when Supabase actually returned one
    // (email confirmation disabled). Otherwise confirmation is still pending.
    if (data?.session) return { status: "signed_in" };
    return { status: "confirmation_required" };
  } catch {
    return { status: "request_failed" };
  }
}

export type SignOutOutcome = { status: "signed_out" } | { status: "sign_out_failed" };

export async function performSignOut(
  auth: Pick<SupabaseAuthLike, "signOut">,
): Promise<SignOutOutcome> {
  try {
    const { error } = await auth.signOut();
    if (error) return { status: "sign_out_failed" };
    return { status: "signed_out" };
  } catch {
    return { status: "sign_out_failed" };
  }
}

// ---------------------------------------------------------------------------
// Session snapshot + post-auth redirect safety.
// ---------------------------------------------------------------------------

export type SupabaseSessionSnapshot = { userId: string; email: string | null };

export function sessionSnapshot(
  session: { user?: { id?: unknown; email?: unknown } | null } | null | undefined,
): SupabaseSessionSnapshot | null {
  const id = session?.user?.id;
  if (typeof id !== "string" || id.length === 0) return null;
  const email = session?.user?.email;
  return { userId: id, email: typeof email === "string" && email.length > 0 ? email : null };
}

/**
 * Constrain a post-auth redirect target to a same-origin path. Anything that
 * could escape the origin ("https://…", "//host", "/\host") falls back to "/".
 */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/")) return "/";
  if (/^\/[/\\]/.test(raw)) return "/";
  if (raw.includes("://")) return "/";
  return raw;
}
