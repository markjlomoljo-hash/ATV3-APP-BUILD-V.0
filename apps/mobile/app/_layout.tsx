import { useEffect, useRef } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import * as Network from "expo-network";
import { AppState } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { supabase } from "../src/lib/supabase";
import { useAuthStore } from "../src/stores/auth";
import { useProfileStore } from "../src/stores/profile";
import { fetchProfile } from "../src/lib/profile-service";
import { recoverPendingMlWork } from "../src/lib/ml";
import { createMobileMlRecoveryLifecycle } from "../src/lib/ml-recovery-lifecycle";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
    },
  },
});

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { status, setSession, setStatus, setOnboardingCompleted } = useAuthStore();
  const { setProfile } = useProfileStore();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        setSession(session);
        try {
          const profile = await fetchProfile(session.user.id);
          if (profile) {
            setProfile(profile);
            setOnboardingCompleted(profile.onboarding_completed);
            setStatus(
              profile.onboarding_completed ? "authenticated" : "onboarding_required"
            );
          } else {
            setOnboardingCompleted(false);
            setStatus("onboarding_required");
          }
        } catch {
          setStatus("authenticated");
        }
      } else {
        setSession(null);
        setProfile(null);
        setStatus("unauthenticated");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setStatus("unauthenticated");
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (status === "loading") return;

    const inAuthGroup = segments[0] === "auth";
    const inOnboardingGroup = segments[0] === "onboarding";

    if (status === "unauthenticated" && !inAuthGroup) {
      router.replace("/auth/welcome");
    } else if (status === "onboarding_required" && !inOnboardingGroup) {
      router.replace("/onboarding/privacy-education");
    } else if (
      status === "authenticated" &&
      (inAuthGroup || inOnboardingGroup)
    ) {
      router.replace("/(tabs)/today");
    }
  }, [status, segments]);

  return null;
}

function MlRecoveryGate() {
  const status = useAuthStore((state) => state.status);
  const lifecycle = useRef(
    createMobileMlRecoveryLifecycle({ recover: recoverPendingMlWork }),
  ).current;

  useEffect(() => {
    void lifecycle.setAuthenticated(status === "authenticated");
  }, [lifecycle, status]);

  useEffect(() => {
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") void lifecycle.onForeground();
    });
    const network = Network.addNetworkStateListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        void lifecycle.onNetworkAvailable();
      }
    });
    return () => {
      appState.remove();
      network.remove();
    };
  }, [lifecycle]);

  return null;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AuthGate />
        <MlRecoveryGate />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="auth" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
