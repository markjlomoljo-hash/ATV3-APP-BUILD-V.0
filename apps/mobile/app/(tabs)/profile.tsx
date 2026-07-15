import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../src/stores/auth";
import { useProfileStore } from "../../src/stores/profile";
import {
  fetchProfile,
  fetchConsents,
  upsertConsents,
} from "../../src/lib/profile-service";
import { supabase } from "../../src/lib/supabase";
import { Button, Card, Divider } from "../../src/components/ui";
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
} from "../../src/components/ui/theme";

interface ConsentRowProps {
  title: string;
  description: string;
  value: boolean;
  onToggle: () => void;
}

function ConsentRow({ title, description, value, onToggle }: ConsentRowProps) {
  return (
    <View style={styles.consentRow}>
      <View style={styles.consentRowContent}>
        <Text style={styles.consentRowTitle}>{title}</Text>
        <Text style={styles.consentRowDesc}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: Colors.border, true: Colors.primary }}
        thumbColor="#fff"
        accessibilityLabel={title}
      />
    </View>
  );
}

function ProfileRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <View style={styles.profileRow}>
      <Text style={styles.profileRowLabel}>{label}</Text>
      <Text style={styles.profileRowValue}>{value ?? "Not set"}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, reset: resetAuth } = useAuthStore();
  const { reset: resetProfile } = useProfileStore();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
  });

  const { data: consents } = useQuery({
    queryKey: ["consents", user?.id],
    queryFn: () => fetchConsents(user!.id),
    enabled: !!user,
  });

  const { mutate: updateConsent } = useMutation({
    mutationFn: async (updates: Record<string, boolean>) => {
      if (!user) throw new Error("auth_required");
      return upsertConsents(user.id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consents", user?.id] });
    },
    onError: (e) => {
      Alert.alert(
        "Update Failed",
        e instanceof Error ? e.message : "Please try again."
      );
    },
  });

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          setSigningOut(true);
          await supabase.auth.signOut();
          queryClient.clear();
          resetAuth();
          resetProfile();
          setSigningOut(false);
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all associated data. This action cannot be undone.\n\nTo proceed, please contact support@acnetrex.com.",
      [{ text: "OK" }]
    );
  };

  const toggle = (key: string, currentValue: boolean) => {
    updateConsent({ [key]: !currentValue });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.display_name?.[0]?.toUpperCase() ??
                user?.email?.[0]?.toUpperCase() ??
                "?"}
            </Text>
          </View>
          <Text style={styles.displayName}>
            {profile?.display_name ?? "Your Profile"}
          </Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {/* Profile details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <Card>
            <ProfileRow
              label="Display Name"
              value={profile?.display_name ?? null}
            />
            <Divider style={{ marginVertical: 0 }} />
            <ProfileRow label="Sex" value={profile?.sex ?? null} />
            <Divider style={{ marginVertical: 0 }} />
            <ProfileRow
              label="Skin Tone"
              value={
                profile?.skin_tone?.replace(/_/g, " ") ?? null
              }
            />
            <Divider style={{ marginVertical: 0 }} />
            <ProfileRow
              label="Timezone"
              value={profile?.timezone ?? null}
            />
          </Card>
        </View>

        {/* Privacy & Consent */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Consent</Text>
          <Text style={styles.sectionSubtitle}>
            All settings are optional and can be changed at any time.
          </Text>
          <Card style={{ gap: 0 }}>
            <ConsentRow
              title="Anonymous Learning"
              description="Contribute anonymized patterns to improve AcneTrex for everyone."
              value={consents?.anonymous_learning ?? false}
              onToggle={() =>
                toggle(
                  "anonymous_learning",
                  consents?.anonymous_learning ?? false
                )
              }
            />
            <Divider style={{ marginVertical: 0 }} />
            <ConsentRow
              title="Raw Image Learning"
              description="Use FaceAtlas images to improve skin analysis models."
              value={consents?.raw_image_learning ?? false}
              onToggle={() =>
                toggle(
                  "raw_image_learning",
                  consents?.raw_image_learning ?? false
                )
              }
            />
            <Divider style={{ marginVertical: 0 }} />
            <ConsentRow
              title="Photos in Reports"
              description="Include FaceAtlas photos in your generated skin reports."
              value={consents?.include_faceatlas_photos_in_reports ?? false}
              onToggle={() =>
                toggle(
                  "include_faceatlas_photos_in_reports",
                  consents?.include_faceatlas_photos_in_reports ?? false
                )
              }
            />
          </Card>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <Card style={{ gap: 0 }}>
            <ConsentRow
              title="Product Analysis Alerts"
              description="Notified when potential product-skin interactions are detected."
              value={consents?.product_analysis_notifications ?? true}
              onToggle={() =>
                toggle(
                  "product_analysis_notifications",
                  consents?.product_analysis_notifications ?? true
                )
              }
            />
            <Divider style={{ marginVertical: 0 }} />
            <ConsentRow
              title="Report Ready"
              description="Notified when your weekly or monthly skin report is ready."
              value={consents?.report_ready_notifications ?? true}
              onToggle={() =>
                toggle(
                  "report_ready_notifications",
                  consents?.report_ready_notifications ?? true
                )
              }
            />
            <Divider style={{ marginVertical: 0 }} />
            <ConsentRow
              title="Streak Reminders"
              description="Reminded when you are at risk of breaking your logging streak."
              value={consents?.streak_risk_notifications ?? true}
              onToggle={() =>
                toggle(
                  "streak_risk_notifications",
                  consents?.streak_risk_notifications ?? true
                )
              }
            />
            <Divider style={{ marginVertical: 0 }} />
            <ConsentRow
              title="Marketing"
              description="Occasional updates about new features and skin care tips."
              value={consents?.marketing_notifications ?? false}
              onToggle={() =>
                toggle(
                  "marketing_notifications",
                  consents?.marketing_notifications ?? false
                )
              }
            />
          </Card>
        </View>

        {/* App info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Card>
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Version</Text>
              <Text style={styles.aboutValue}>3.0.0-beta</Text>
            </View>
            <Divider style={{ marginVertical: 0 }} />
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Build</Text>
              <Text style={styles.aboutValue}>Phase 1</Text>
            </View>
            <Divider style={{ marginVertical: 0 }} />
            <Pressable style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Privacy Policy</Text>
              <Text style={styles.aboutLink}>View →</Text>
            </Pressable>
            <Divider style={{ marginVertical: 0 }} />
            <Pressable style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Terms of Service</Text>
              <Text style={styles.aboutLink}>View →</Text>
            </Pressable>
          </Card>
        </View>

        {/* Medical disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            AcneTrex is not a medical device and does not diagnose, treat, or
            prevent any disease. Always consult a qualified dermatologist for
            medical advice.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Sign Out"
            onPress={handleSignOut}
            variant="secondary"
            loading={signingOut}
          />
          <Pressable onPress={handleDeleteAccount} style={styles.deleteButton}>
            <Text style={styles.deleteText}>Request Account Deletion</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  header: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  avatarText: { fontSize: 32, fontWeight: "800", color: "#fff" },
  displayName: {
    ...Typography.title2,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  email: { ...Typography.body, color: Colors.textSecondary, marginTop: 4 },
  section: { marginBottom: Spacing.xl },
  sectionTitle: {
    ...Typography.title3,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  profileRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
  },
  profileRowLabel: { ...Typography.body, color: Colors.textSecondary },
  profileRowValue: { ...Typography.bodyMedium, color: Colors.textPrimary },
  consentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  consentRowContent: { flex: 1 },
  consentRowTitle: { ...Typography.bodyMedium, color: Colors.textPrimary },
  consentRowDesc: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  aboutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
  },
  aboutLabel: { ...Typography.body, color: Colors.textSecondary },
  aboutValue: { ...Typography.bodyMedium, color: Colors.textPrimary },
  aboutLink: { ...Typography.bodyMedium, color: Colors.primary },
  disclaimer: {
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  disclaimerText: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  actions: { gap: Spacing.sm },
  deleteButton: { alignItems: "center", paddingVertical: Spacing.md },
  deleteText: { ...Typography.body, color: Colors.error },
});
