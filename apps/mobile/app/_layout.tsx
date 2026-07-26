import { useEffect } from "react";
import { Alert, AppState } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "../src/lib/supabase";
import { useAuthStore } from "../src/stores/auth";
import { useProfileStore } from "../src/stores/profile";
import { fetchProfile } from "../src/lib/profile-service";
import { replayPendingOutboxEvents } from "../src/lib/local-outbox";
import { replayQueuedMlJobs } from "../src/lib/ml";
import { syncScheduledReminders } from "../src/lib/notifications";

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

/**
 * Replays offline queues (local write outbox + queued ML jobs) whenever the
 * app returns to the foreground with an authenticated session. Replay is
 * idempotent and honest: nothing is marked synced unless the server write
 * actually succeeded.
 */
function OfflineReplayGate() {
  const { status, user } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (status !== "authenticated") return;
    const userId = user?.id;

    const replay = () => {
      void replayPendingOutboxEvents()
        .then((result) => {
          if (result.replayed > 0 || result.failed > 0) {
            // Synced writes may change what the visible screens show, and
            // the Logs outbox banner must pick up terminal failures.
            queryClient.invalidateQueries();
          }
          if (result.failed > 0) {
            // result.failed is non-zero only on the pass where an event
            // transitioned to terminal failure, so this alerts exactly once
            // per event. The "will sync automatically" promise broke — say
            // so instead of letting the queue drain silently.
            Alert.alert(
              "Some Logs Could Not Sync",
              `${result.failed} log${result.failed === 1 ? "" : "s"} saved on this device could not be synced and will not retry automatically. Open the Logs tab to see the error and retry.`
            );
          }
        })
        .catch(() => undefined);
      void replayQueuedMlJobs().catch(() => undefined);
      // Reconcile local reminders against real state (consents, streak,
      // active plan). No-op unless the user enabled reminders; never
      // requests notification permission.
      if (userId) void syncScheduledReminders(userId).catch(() => undefined);
    };

    // Once on becoming authenticated, then on every return to foreground.
    replay();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") replay();
    });
    return () => subscription.remove();
  }, [status, user?.id, queryClient]);

  return null;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AuthGate />
        <OfflineReplayGate />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="auth" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
