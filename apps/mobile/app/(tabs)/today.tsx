import { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useAuthStore } from "../../src/stores/auth";
import { useProfileStore } from "../../src/stores/profile";
import {
  fetchTodayLogs,
  TodaySummary,
} from "../../src/lib/daily-logs-service";
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
} from "../../src/components/ui/theme";
import { Card } from "../../src/components/ui";

interface LogModule {
  key: string;
  icon: string;
  title: string;
  subtitle: string;
  logged: boolean;
  route: string;
}

function getModules(summary: TodaySummary | undefined): LogModule[] {
  return [
    {
      key: "sleep",
      icon: "😴",
      title: "SleepDerm",
      subtitle: summary?.sleepLogged ? "Sleep logged" : "Log last night's sleep",
      logged: summary?.sleepLogged ?? false,
      route: "/(tabs)/logs",
    },
    {
      key: "food",
      icon: "🥗",
      title: "DermDiet",
      subtitle: summary?.foodLogged ? "Meals logged" : "Log today's meals",
      logged: summary?.foodLogged ?? false,
      route: "/(tabs)/logs",
    },
    {
      key: "stress",
      icon: "😤",
      title: "Stress Level",
      subtitle: summary?.stressLogged ? "Stress logged" : "Log today's stress",
      logged: summary?.stressLogged ?? false,
      route: "/(tabs)/logs",
    },
    {
      key: "treatment",
      icon: "💊",
      title: "Treatment",
      subtitle: summary?.treatmentCheckedIn
        ? "Checked in"
        : "Check in on your treatment",
      logged: summary?.treatmentCheckedIn ?? false,
      route: "/(tabs)/logs",
    },
    {
      key: "faceatlas",
      icon: "📷",
      title: "FaceAtlas",
      subtitle: "Capture a skin scan",
      logged: false,
      route: "/(tabs)/faceatlas",
    },
  ];
}

function LogCard({
  module,
  onPress,
}: {
  module: LogModule;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.logCard,
        module.logged && styles.logCardLogged,
        pressed && { opacity: 0.85 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${module.title}: ${module.subtitle}`}
    >
      <View style={styles.logCardLeft}>
        <Text style={styles.logCardIcon}>{module.icon}</Text>
        <View>
          <Text style={styles.logCardTitle}>{module.title}</Text>
          <Text style={styles.logCardSubtitle}>{module.subtitle}</Text>
        </View>
      </View>
      {module.logged ? (
        <View style={styles.loggedBadge}>
          <Text style={styles.loggedText}>✓</Text>
        </View>
      ) : (
        <Text style={styles.logArrow}>›</Text>
      )}
    </Pressable>
  );
}

function ProgressCard({ summary }: { summary: TodaySummary | undefined }) {
  const count = summary?.logsCount ?? 0;
  const total = 4; // sleep, food, stress, treatment
  const pct = Math.min(count / total, 1);

  return (
    <Card style={styles.progressCard}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressTitle}>Today's Progress</Text>
        <Text style={styles.progressCount}>
          {count}/{total} logged
        </Text>
      </View>
      <View style={styles.progressBar}>
        <View
          style={[styles.progressFill, { width: `${pct * 100}%` }]}
        />
      </View>
      <Text style={styles.progressHint}>
        {count === 0
          ? "Start logging to build your skin intelligence."
          : count < 2
          ? "Good start — keep going for better insights."
          : count < total
          ? "Almost there — great data day!"
          : "Excellent! Full data day for maximum insights."}
      </Text>
    </Card>
  );
}

export default function TodayScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { profile } = useProfileStore();

  const {
    data: summary,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["today-logs", user?.id],
    queryFn: () => fetchTodayLogs(user!.id),
    enabled: !!user,
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const today = format(new Date(), "EEEE, MMMM d");
  const displayName = profile?.display_name ?? "there";
  const modules = getModules(summary);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good day, {displayName}</Text>
            <Text style={styles.date}>{today}</Text>
          </View>
          <View style={styles.logoMark}>
            <Text style={styles.logoMarkText}>✦</Text>
          </View>
        </View>

        {/* Progress */}
        {!isLoading && <ProgressCard summary={summary} />}

        {/* Today's Modules */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Logs</Text>
          <Text style={styles.sectionSubtitle}>
            Each log you complete builds your personal skin intelligence.
          </Text>
        </View>

        <View style={styles.modules}>
          {modules.map((m) => (
            <LogCard
              key={m.key}
              module={m}
              onPress={() => router.push(m.route as never)}
            />
          ))}
        </View>

        {/* Insights teaser */}
        <Card
          style={styles.insightsTeaser}
          onPress={() => router.push("/(tabs)/insights" as never)}
        >
          <View style={styles.insightsTeaserRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.insightsTeaserTitle}>
                🧠 CutisAI Insights
              </Text>
              <Text style={styles.insightsTeaserText}>
                {(summary?.logsCount ?? 0) < 7
                  ? `Log for ${Math.max(0, 7 - (summary?.logsCount ?? 0))} more days to unlock pattern analysis.`
                  : "Tap to view your skin patterns and insights."}
              </Text>
            </View>
            <Text style={styles.logArrow}>›</Text>
          </View>
        </Card>

        {/* Data note */}
        <View style={styles.dataNote}>
          <Text style={styles.dataNoteText}>
            Your data is private and stored securely. AcneTrex never fabricates
            scores or insights — everything shown is derived from your real logs.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.lg,
  },
  greeting: { ...Typography.title2, color: Colors.textPrimary },
  date: { ...Typography.body, color: Colors.textSecondary, marginTop: 2 },
  logoMark: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoMarkText: { fontSize: 20, color: "#fff" },
  progressCard: { marginBottom: Spacing.lg },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  progressTitle: { ...Typography.bodyMedium, color: Colors.textPrimary },
  progressCount: { ...Typography.label, color: Colors.primary },
  progressBar: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: BorderRadius.full,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  progressHint: { ...Typography.caption, color: Colors.textSecondary },
  section: { marginBottom: Spacing.md },
  sectionTitle: { ...Typography.title3, color: Colors.textPrimary },
  sectionSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  modules: { gap: Spacing.sm, marginBottom: Spacing.lg },
  logCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logCardLogged: {
    borderColor: Colors.primaryMid,
    backgroundColor: "#f0fdf4",
  },
  logCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  logCardIcon: { fontSize: 28 },
  logCardTitle: { ...Typography.bodyMedium, color: Colors.textPrimary },
  logCardSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  loggedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  loggedText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  logArrow: { fontSize: 22, color: Colors.textMuted, fontWeight: "300" },
  insightsTeaser: { marginBottom: Spacing.lg },
  insightsTeaserRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  insightsTeaserTitle: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  insightsTeaserText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  dataNote: {
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  dataNoteText: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
});
