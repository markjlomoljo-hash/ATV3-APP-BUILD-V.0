import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { supabase } from "../../../src/lib/supabase";
import {
  fetchPrivacyConsents,
  requestPrivacyDeletion,
  requestPrivacyExport,
  updatePrivacyConsent,
  type PrivacyConsentSettings,
} from "../../../src/lib/privacy-service";
import { Colors, Spacing, Typography, BorderRadius } from "../../../src/components/ui/theme";
import { Button, Card } from "../../../src/components/ui";

type ScreenState = "loading" | "ready" | "auth_required" | "not_configured" | "error";

const CONSENT_ITEMS = [
  {
    key: "personalLearning" as const,
    label: "Personal Learning",
    description: "Allow CutisAI and Skin Twin to use your logs for personalized insights.",
    sensitive: false,
  },
  {
    key: "anonymousLearning" as const,
    label: "Anonymous Learning",
    description: "Contribute anonymized, non-identifying data to improve the research network.",
    sensitive: false,
  },
  {
    key: "rawImageStorage" as const,
    label: "Raw Image Storage",
    description: "Store original FaceAtlas photos in your private storage bucket.",
    sensitive: false,
  },
  {
    key: "notificationsEnabled" as const,
    label: "Notifications",
    description: "Receive reminders for daily logging, treatment check-ins, and streaks.",
    sensitive: false,
  },
  {
    key: "cycleContext" as const,
    label: "Cycle Context",
    description: "Log hormonal cycle data as a confounder in pattern analysis.",
    sensitive: true,
  },
  {
    key: "exportEnabled" as const,
    label: "Data Export",
    description: "Allow generation of data exports and dermatologist reports.",
    sensitive: false,
  },
];

function classifyScreenError(error: unknown): Exclude<ScreenState, "loading" | "ready"> {
  const code = error instanceof Error ? error.message : "unknown_error";
  if (code === "auth_required") return "auth_required";
  if (code === "api_not_configured") return "not_configured";
  return "error";
}

export default function PrivacyScreen() {
  const [screenState, setScreenState] = useState<ScreenState>("loading");
  const [consent, setConsent] = useState<PrivacyConsentSettings | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [savingKey, setSavingKey] = useState<keyof PrivacyConsentSettings | null>(null);
  const [requestingExport, setRequestingExport] = useState(false);
  const [deletingData, setDeletingData] = useState(false);

  const loadConsent = useCallback(async () => {
    try {
      const stored = await fetchPrivacyConsents();
      setConsent(stored);
      setScreenState("ready");
    } catch (error) {
      setConsent(null);
      setScreenState(classifyScreenError(error));
    }
  }, []);

  useEffect(() => {
    void loadConsent();
  }, [loadConsent]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConsent();
    setRefreshing(false);
  }, [loadConsent]);

  const saveConsent = useCallback(async (key: keyof PrivacyConsentSettings, value: boolean) => {
    if (!consent) return;
    setSavingKey(key);
    try {
      await updatePrivacyConsent(key, value);
      const stored = await fetchPrivacyConsents();
      setConsent(stored);
    } catch (error) {
      Alert.alert(
        "Consent not changed",
        error instanceof Error ? error.message.replace(/_/g, " ") : "The server could not confirm this change.",
      );
    } finally {
      setSavingKey(null);
    }
  }, [consent]);

  const exportData = useCallback(async () => {
    setRequestingExport(true);
    try {
      const response = await requestPrivacyExport();
      Alert.alert("Export request confirmed", response.message);
    } catch (error) {
      Alert.alert(
        "Export not requested",
        error instanceof Error ? error.message.replace(/_/g, " ") : "The server did not confirm an export request.",
      );
    } finally {
      setRequestingExport(false);
    }
  }, []);

  const confirmDeletion = useCallback(() => {
    Alert.alert(
      "Delete all account data?",
      "This permanently queues deletion of your logs, scans, conversations, reports, and account data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Final confirmation",
              "Submit the permanent account deletion request now?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete my data",
                  style: "destructive",
                  onPress: async () => {
                    setDeletingData(true);
                    try {
                      const response = await requestPrivacyDeletion();
                      Alert.alert("Deletion request confirmed", response.message);
                      await supabase.auth.signOut();
                      router.replace("/auth/sign-in" as never);
                    } catch (error) {
                      Alert.alert(
                        "Deletion not requested",
                        error instanceof Error ? error.message.replace(/_/g, " ") : "The server did not confirm a deletion request.",
                      );
                    } finally {
                      setDeletingData(false);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }, []);

  if (screenState !== "ready" || !consent) {
    const message = screenState === "loading"
      ? "Loading stored privacy settings…"
      : screenState === "auth_required"
        ? "Sign in to manage your privacy settings."
        : screenState === "not_configured"
          ? "The production API is not configured on this build. No consent values are being assumed."
          : "Stored consent values could not be loaded. Pull to retry; no defaults are being shown.";

    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Privacy & Consent</Text>
        </View>
        <ScrollView
          contentContainerStyle={styles.centered}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {screenState === "loading" && <ActivityIndicator color={Colors.primary} size="large" />}
          <Text style={styles.stateMessage}>{message}</Text>
          {screenState !== "loading" && (
            <Button title="Retry" onPress={() => void loadConsent()} variant="secondary" />
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Privacy & Consent</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Card style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>Your data, your control</Text>
          <Text style={styles.aboutText}>
            These values were loaded from your account. Revoking consent stops future use but does not delete historical data; use the deletion option below when required.
          </Text>
        </Card>

        <Text style={styles.sectionTitle}>Consent Settings</Text>
        {CONSENT_ITEMS.map((item) => (
          <View key={item.key} style={styles.consentRow}>
            <View style={styles.consentCopy}>
              <View style={styles.labelRow}>
                <Text style={styles.consentLabel}>{item.label}</Text>
                {item.sensitive && (
                  <View style={styles.sensitiveBadge}>
                    <Text style={styles.sensitiveText}>Sensitive</Text>
                  </View>
                )}
                {savingKey === item.key && <ActivityIndicator color={Colors.primary} size="small" />}
              </View>
              <Text style={styles.consentDesc}>{item.description}</Text>
            </View>
            <Switch
              value={consent[item.key]}
              onValueChange={(value) => void saveConsent(item.key, value)}
              disabled={savingKey !== null}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#fff"
              accessibilityLabel={item.label}
            />
          </View>
        ))}

        <Text style={styles.sectionTitle}>Data Export</Text>
        <Card style={styles.exportCard}>
          <Text style={styles.exportTitle}>Export your data</Text>
          <Text style={styles.exportText}>
            Request a server-generated JSON export of your logs, scans, conversations, and settings. Raw images are governed by the stored consent above.
          </Text>
          <Button
            title="Request Data Export"
            variant="secondary"
            onPress={() => void exportData()}
            loading={requestingExport}
            disabled={requestingExport}
          />
        </Card>

        <Text style={styles.sectionTitle}>Danger Zone</Text>
        <Card style={styles.dangerCard}>
          <Text style={styles.dangerTitle}>Delete all account data</Text>
          <Text style={styles.dangerText}>
            Permanently queue deletion of your account and associated logs, scans, conversations, reports, and settings.
          </Text>
          <Button
            title="Delete All My Data"
            variant="danger"
            onPress={confirmDeletion}
            loading={deletingData}
            disabled={deletingData}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { minWidth: 64, paddingRight: Spacing.sm },
  backText: { ...Typography.bodyMedium, color: Colors.primary },
  title: { ...Typography.title3, color: Colors.textPrimary, flex: 1, textAlign: "center", paddingRight: 64 },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  centered: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: Spacing.xl, gap: Spacing.lg },
  stateMessage: { ...Typography.body, color: Colors.textSecondary, textAlign: "center", lineHeight: 22, maxWidth: 340 },
  aboutCard: { marginBottom: Spacing.lg },
  aboutTitle: { ...Typography.bodyMedium, color: Colors.textPrimary, marginBottom: 6 },
  aboutText: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
  sectionTitle: { ...Typography.title3, color: Colors.textPrimary, marginBottom: Spacing.md, marginTop: Spacing.sm },
  consentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  consentCopy: { flex: 1 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginBottom: 2 },
  consentLabel: { ...Typography.bodyMedium, color: Colors.textPrimary },
  consentDesc: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
  sensitiveBadge: {
    backgroundColor: "#fef3c7",
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sensitiveText: { ...Typography.caption, color: "#92400e", fontSize: 10 },
  exportCard: { marginBottom: Spacing.lg },
  exportTitle: { ...Typography.bodyMedium, color: Colors.textPrimary, marginBottom: 6 },
  exportText: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18, marginBottom: Spacing.md },
  dangerCard: { borderColor: "#fca5a5", backgroundColor: "#fff5f5" },
  dangerTitle: { ...Typography.bodyMedium, color: Colors.error, marginBottom: 6 },
  dangerText: { ...Typography.caption, color: "#7f1d1d", lineHeight: 18, marginBottom: Spacing.md },
});
