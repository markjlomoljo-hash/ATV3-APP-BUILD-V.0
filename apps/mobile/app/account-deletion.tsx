/**
 * Account Deletion Request
 *
 * The deletion_requests table exists server-side and is readable by its
 * owner, but only the backend deletion pipeline can create or process
 * requests — there is no client-writable surface or API route yet. This
 * screen therefore does three honest things:
 *   1. Shows any deletion requests that actually exist on the server.
 *   2. Explains exactly what deletion covers.
 *   3. Guides the user through the real (manual, email-based) request path.
 * It never records a request locally or pretends one was submitted.
 */
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { format, parseISO } from "date-fns";
import { useAuthStore } from "../src/stores/auth";
import {
  fetchDeletionRequests,
  DeletionRequest,
} from "../src/lib/profile-service";
import { Button, Card } from "../src/components/ui";
import { SUPPORT_EMAIL } from "../src/lib/legal-content";
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
} from "../src/components/ui/theme";

function RequestRow({ request }: { request: DeletionRequest }) {
  let requestedAt = request.requested_at;
  try {
    requestedAt = format(parseISO(request.requested_at), "MMM d, yyyy");
  } catch {
    // keep raw value
  }
  return (
    <View style={styles.requestRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.requestType}>
          {request.request_type.replace(/_/g, " ")}
        </Text>
        <Text style={styles.requestDate}>Requested {requestedAt}</Text>
      </View>
      <Text style={styles.requestStatus}>{request.status}</Text>
    </View>
  );
}

export default function AccountDeletionScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const {
    data: requests,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["deletion-requests", user?.id],
    queryFn: () => fetchDeletionRequests(user!.id),
    enabled: !!user,
  });

  const openEmailRequest = () => {
    Alert.alert(
      "Request Account Deletion",
      "This opens your email app with a pre-filled deletion request to AcneTrex support. Deletion is permanent once the backend pipeline processes it.\n\nNothing is submitted until you send the email.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open Email",
          style: "destructive",
          onPress: () => {
            const subject = encodeURIComponent("Account Deletion Request");
            const body = encodeURIComponent(
              `Please permanently delete my AcneTrex account and all associated data.\n\nAccount email: ${user?.email ?? "(fill in your account email)"}`
            );
            Linking.openURL(
              `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`
            ).catch(() => {
              Alert.alert(
                "Could Not Open Email",
                `Please email ${SUPPORT_EMAIL} with the subject "Account Deletion Request" from your account email address.`
              );
            });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backText}>‹ Back</Text>
          </Pressable>
        </View>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>YOUR DATA, YOUR CHOICE</Text>
          <Text style={styles.title}>Delete Your Account</Text>
          <Text style={styles.subtitle}>
            Deleting your account permanently removes your profile, logs, scans,
            reports, and consent records once the backend deletion pipeline
            completes. This cannot be undone.
          </Text>
        </View>

        {/* Existing requests — real server state only */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Existing Deletion Requests</Text>
          {isLoading && (
            <Text style={styles.mutedText}>Checking for existing requests...</Text>
          )}
          {!isLoading && !!error && (
            <Card>
              <Text style={styles.mutedText}>
                Could not check for existing deletion requests right now
                {error instanceof Error ? ` (${error.message})` : ""}. Pull to
                retry later — nothing shown here is ever assumed.
              </Text>
            </Card>
          )}
          {!isLoading && !error && (requests?.length ?? 0) === 0 && (
            <Card>
              <Text style={styles.mutedText}>
                No deletion requests are on record for this account.
              </Text>
            </Card>
          )}
          {!isLoading && !error && (requests?.length ?? 0) > 0 && (
            <Card style={{ gap: Spacing.sm }}>
              {requests!.map((request) => (
                <RequestRow key={request.id} request={request} />
              ))}
            </Card>
          )}
        </View>

        {/* Honest state of the in-app flow */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How Deletion Works Right Now</Text>
          <Card>
            <Text style={styles.bodyText}>
              One-tap in-app deletion is not yet available in this beta: deletion
              requests can only be created by the backend pipeline, and the app
              will never mark a deletion as requested unless the server actually
              recorded it.
            </Text>
            <Text style={[styles.bodyText, { marginTop: Spacing.sm }]}>
              To request deletion today, email {SUPPORT_EMAIL} from your account
              email address. Your request appears in the list above once the
              backend records it.
            </Text>
          </Card>
        </View>

        <Button
          title="Email Deletion Request"
          onPress={openEmailRequest}
          variant="danger"
        />

        <View style={styles.honestyNote}>
          <Text style={styles.honestyText}>
            AcneTrex never fabricates request or deletion states. Everything on
            this screen reflects real backend records.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  headerRow: { marginBottom: Spacing.sm },
  backButton: { alignSelf: "flex-start", paddingVertical: Spacing.sm },
  backText: { ...Typography.bodyMedium, color: Colors.primary },
  header: { marginBottom: Spacing.xl },
  eyebrow: {
    ...Typography.eyebrow,
    color: Colors.error,
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: {
    ...Typography.title1,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  subtitle: { ...Typography.body, color: Colors.textSecondary, lineHeight: 22 },
  section: { marginBottom: Spacing.xl },
  sectionTitle: {
    ...Typography.title3,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  mutedText: { ...Typography.body, color: Colors.textMuted, lineHeight: 20 },
  bodyText: { ...Typography.body, color: Colors.textSecondary, lineHeight: 22 },
  requestRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  requestType: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    textTransform: "capitalize",
  },
  requestDate: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  requestStatus: {
    ...Typography.label,
    color: Colors.warning,
    textTransform: "uppercase",
  },
  honestyNote: {
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  honestyText: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
});
