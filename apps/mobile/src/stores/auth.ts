import { create } from "zustand";
import { Session, User } from "@supabase/supabase-js";

export type AuthStatus =
  | "loading"
  | "unauthenticated"
  | "authenticated"
  | "onboarding_required";

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  onboardingCompleted: boolean;
  setSession: (session: Session | null) => void;
  setOnboardingCompleted: (completed: boolean) => void;
  setStatus: (status: AuthStatus) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "loading",
  session: null,
  user: null,
  onboardingCompleted: false,
  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
      status: session ? "authenticated" : "unauthenticated",
    }),
  setOnboardingCompleted: (completed) =>
    set({ onboardingCompleted: completed }),
  setStatus: (status) => set({ status }),
  reset: () =>
    set({
      status: "unauthenticated",
      session: null,
      user: null,
      onboardingCompleted: false,
    }),
}));
