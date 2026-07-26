import { describe, expect, it, vi } from "vitest";
import {
  normalizeEmail,
  performPasswordSignIn,
  performPasswordSignUp,
  performSignOut,
  readSupabaseWebAuthConfig,
  safeNextPath,
  sessionSnapshot,
  signInErrorMessage,
  signUpErrorMessage,
  validateSignInInput,
  validateSignUpInput,
} from "./supabase-web-auth";

describe("readSupabaseWebAuthConfig", () => {
  it("fails closed when the URL or public key is absent", () => {
    expect(readSupabaseWebAuthConfig({})).toBeNull();
    expect(readSupabaseWebAuthConfig({ NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co" })).toBeNull();
    expect(
      readSupabaseWebAuthConfig({ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_abc" }),
    ).toBeNull();
  });

  it("refuses secret keys just like the browser client", () => {
    expect(
      readSupabaseWebAuthConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_never",
      }),
    ).toBeNull();
  });

  it("resolves NEXT_PUBLIC publishable and anon key fallbacks", () => {
    expect(
      readSupabaseWebAuthConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_abc",
      }),
    ).toEqual({ url: "https://x.supabase.co", publishableKey: "sb_publishable_abc" });

    expect(
      readSupabaseWebAuthConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      }),
    ).toEqual({ url: "https://x.supabase.co", publishableKey: "anon-key" });
  });

  it("prefers VITE_ values first, matching the generated client fallback chain", () => {
    expect(
      readSupabaseWebAuthConfig({
        VITE_SUPABASE_URL: "https://vite.supabase.co",
        VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_vite",
        NEXT_PUBLIC_SUPABASE_URL: "https://next.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_next",
      }),
    ).toEqual({ url: "https://vite.supabase.co", publishableKey: "sb_publishable_vite" });
  });
});

describe("sign-in input validation", () => {
  it("normalizes the email the same way the mobile flow does", () => {
    expect(normalizeEmail("  User@Example.COM ")).toBe("user@example.com");
    const result = validateSignInInput({ email: "  User@Example.COM ", password: "longenough" });
    expect(result).toEqual({ ok: true, email: "user@example.com", password: "longenough" });
  });

  it("rejects malformed email and short passwords with per-field messages", () => {
    const result = validateSignInInput({ email: "not-an-email", password: "short" });
    expect(result).toEqual({
      ok: false,
      fieldErrors: {
        email: "Enter a valid email address",
        password: "Password must be at least 8 characters",
      },
    });
  });
});

describe("sign-up input validation", () => {
  it("applies the mobile password strength rules in order", () => {
    expect(
      validateSignUpInput({ email: "a@b.co", password: "short", confirmPassword: "short" }),
    ).toEqual({ ok: false, fieldErrors: { password: "Password must be at least 8 characters" } });

    expect(
      validateSignUpInput({ email: "a@b.co", password: "lowercase1", confirmPassword: "lowercase1" }),
    ).toEqual({ ok: false, fieldErrors: { password: "Must contain at least one uppercase letter" } });

    expect(
      validateSignUpInput({ email: "a@b.co", password: "NoNumbers", confirmPassword: "NoNumbers" }),
    ).toEqual({ ok: false, fieldErrors: { password: "Must contain at least one number" } });
  });

  it("rejects mismatched confirmation", () => {
    expect(
      validateSignUpInput({ email: "a@b.co", password: "Valid1234", confirmPassword: "Other1234" }),
    ).toEqual({ ok: false, fieldErrors: { confirmPassword: "Passwords do not match" } });
  });

  it("accepts a valid submission and normalizes the email", () => {
    expect(
      validateSignUpInput({ email: " A@B.CO ", password: "Valid1234", confirmPassword: "Valid1234" }),
    ).toEqual({ ok: true, email: "a@b.co", password: "Valid1234" });
  });
});

describe("Supabase auth error copy", () => {
  it("maps the credential and confirmation errors like mobile", () => {
    expect(signInErrorMessage("Invalid login credentials")).toBe(
      "Incorrect email or password. Please try again.",
    );
    expect(signInErrorMessage("Email not confirmed")).toBe(
      "Please confirm your email address before signing in.",
    );
    expect(signInErrorMessage("Rate limit exceeded")).toBe("Rate limit exceeded");
  });

  it("maps the duplicate-account error like mobile", () => {
    expect(signUpErrorMessage("User already registered")).toBe(
      "An account with this email already exists. Please sign in instead.",
    );
    expect(signUpErrorMessage("Signup disabled")).toBe("Signup disabled");
  });
});

describe("performPasswordSignIn", () => {
  it("never calls Supabase for invalid input", async () => {
    const signInWithPassword = vi.fn();
    const outcome = await performPasswordSignIn(
      { signInWithPassword },
      { email: "bad", password: "short" },
    );
    expect(outcome.status).toBe("invalid");
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("reports signed_in only when Supabase returns no error", async () => {
    const signInWithPassword = vi.fn(async () => ({ error: null }));
    const outcome = await performPasswordSignIn(
      { signInWithPassword },
      { email: " User@Example.com ", password: "longenough" },
    );
    expect(outcome).toEqual({ status: "signed_in" });
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "longenough",
    });
  });

  it("surfaces mapped auth failures without inventing a session", async () => {
    const signInWithPassword = vi.fn(async () => ({
      error: { message: "Invalid login credentials" },
    }));
    const outcome = await performPasswordSignIn(
      { signInWithPassword },
      { email: "a@b.co", password: "longenough" },
    );
    expect(outcome).toEqual({
      status: "auth_failed",
      message: "Incorrect email or password. Please try again.",
    });
  });

  it("fails closed as request_failed when the transport throws", async () => {
    const signInWithPassword = vi.fn(async () => {
      throw new Error("network down");
    });
    const outcome = await performPasswordSignIn(
      { signInWithPassword },
      { email: "a@b.co", password: "longenough" },
    );
    expect(outcome).toEqual({ status: "request_failed" });
  });
});

describe("performPasswordSignUp", () => {
  const validInput = { email: "a@b.co", password: "Valid1234", confirmPassword: "Valid1234" };

  it("never calls Supabase for invalid input", async () => {
    const signUp = vi.fn();
    const outcome = await performPasswordSignUp(
      { signUp },
      { email: "a@b.co", password: "weak", confirmPassword: "weak" },
    );
    expect(outcome.status).toBe("invalid");
    expect(signUp).not.toHaveBeenCalled();
  });

  it("reports confirmation_required when no session is returned", async () => {
    const signUp = vi.fn(async () => ({ data: { session: null }, error: null }));
    const outcome = await performPasswordSignUp({ signUp }, validInput, {
      emailRedirectTo: "https://app.example/auth/sign-in",
    });
    expect(outcome).toEqual({ status: "confirmation_required" });
    expect(signUp).toHaveBeenCalledWith({
      email: "a@b.co",
      password: "Valid1234",
      options: { emailRedirectTo: "https://app.example/auth/sign-in" },
    });
  });

  it("reports signed_in only when Supabase actually returned a session", async () => {
    const signUp = vi.fn(async () => ({
      data: { session: { access_token: "token" } },
      error: null,
    }));
    const outcome = await performPasswordSignUp({ signUp }, validInput);
    expect(outcome).toEqual({ status: "signed_in" });
    expect(signUp).toHaveBeenCalledWith({ email: "a@b.co", password: "Valid1234" });
  });

  it("maps duplicate-account errors and fails closed on transport errors", async () => {
    const duplicate = vi.fn(async () => ({
      data: null,
      error: { message: "User already registered" },
    }));
    await expect(performPasswordSignUp({ signUp: duplicate }, validInput)).resolves.toEqual({
      status: "auth_failed",
      message: "An account with this email already exists. Please sign in instead.",
    });

    const throwing = vi.fn(async () => {
      throw new Error("network down");
    });
    await expect(performPasswordSignUp({ signUp: throwing }, validInput)).resolves.toEqual({
      status: "request_failed",
    });
  });
});

describe("performSignOut", () => {
  it("reports signed_out only on a clean response", async () => {
    const signOut = vi.fn(async () => ({ error: null }));
    await expect(performSignOut({ signOut })).resolves.toEqual({ status: "signed_out" });
  });

  it("fails closed on Supabase errors and thrown transport errors", async () => {
    const withError = vi.fn(async () => ({ error: { message: "boom" } }));
    await expect(performSignOut({ signOut: withError })).resolves.toEqual({
      status: "sign_out_failed",
    });

    const throwing = vi.fn(async () => {
      throw new Error("network down");
    });
    await expect(performSignOut({ signOut: throwing })).resolves.toEqual({
      status: "sign_out_failed",
    });
  });
});

describe("sessionSnapshot", () => {
  it("returns null without a real user id", () => {
    expect(sessionSnapshot(null)).toBeNull();
    expect(sessionSnapshot(undefined)).toBeNull();
    expect(sessionSnapshot({ user: null })).toBeNull();
    expect(sessionSnapshot({ user: { id: "" } })).toBeNull();
    expect(sessionSnapshot({ user: { id: 42 } })).toBeNull();
  });

  it("extracts the user id and email, treating non-string email as absent", () => {
    expect(sessionSnapshot({ user: { id: "user-1", email: "a@b.co" } })).toEqual({
      userId: "user-1",
      email: "a@b.co",
    });
    expect(sessionSnapshot({ user: { id: "user-1", email: undefined } })).toEqual({
      userId: "user-1",
      email: null,
    });
  });
});

describe("safeNextPath", () => {
  it("keeps same-origin relative paths", () => {
    expect(safeNextPath("/faceatlas")).toBe("/faceatlas");
    expect(safeNextPath("/treatments?tab=tasks")).toBe("/treatments?tab=tasks");
  });

  it("falls back to the dashboard for anything that could leave the origin", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath("")).toBe("/");
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("/\\evil.example")).toBe("/");
    // Fail closed: embedded absolute URLs anywhere in the value are rejected.
    expect(safeNextPath("/redirect?to=https://evil.example")).toBe("/");
    expect(safeNextPath("javascript:alert(1)")).toBe("/");
  });
});
