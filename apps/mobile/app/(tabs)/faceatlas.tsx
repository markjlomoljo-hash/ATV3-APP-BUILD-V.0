import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../src/stores/auth";
import { Card, EmptyState, Badge } from "../../src/components/ui";
import { Colors, Spacing, Typography, BorderRadius } from "../../src/components/ui/theme";
import { ObservedSkinVisualization } from "../../src/components/SkinVisualization";
import { fetchFaceAtlasScanDetail, fetchFaceAtlasScans } from "../../src/lib/faceatlas-service";
import { buildObservedSkinViewModel, latestCompletedScan } from "../../src/lib/faceatlas-visualization";

export default function FaceAtlasScreen() {
  const { user } = useAuthStore();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["face-scans", user?.id],
    queryFn: async () => {
      const scans = await fetchFaceAtlasScans();
      const latest = latestCompletedScan(scans);
      const observed = latest
        ? buildObservedSkinViewModel(await fetchFaceAtlasScanDetail(latest.id))
        : buildObservedSkinViewModel(null);
      return { scans, observed };
    },
    enabled: !!user,
  });
  const scans = data?.scans ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>FaceAtlas</Text>
          <Text style={styles.subtitle}>
            Capture and track your skin over time with guided photo analysis.
          </Text>
        </View>

        {/* Readiness notice */}
        <Card style={styles.readinessCard}>
          <View style={styles.readinessRow}>
            <Text style={styles.readinessIcon}>📷</Text>
            <View style={styles.readinessContent}>
              <View style={styles.readinessHeader}>
                <Text style={styles.readinessTitle}>Camera Capture</Text>
                <Badge label="native_device_required" color="#fef3c7" textColor="#92400e" />
              </View>
              <Text style={styles.readinessText}>
                FaceAtlas photo capture requires a physical iOS or Android device.
                The capture workflow, annotation tools, and lesion tracking are
                implemented and ready — connect a device to use them.
              </Text>
            </View>
          </View>
        </Card>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Skin Model</Text>
          <Card style={styles.observedCard}>
            {isLoading ? (
              <Text style={styles.loadingText}>Loading persisted FaceAtlas observations…</Text>
            ) : isError ? (
              <Text style={styles.errorText}>FaceAtlas observations are temporarily unavailable. No skin markers are shown.</Text>
            ) : (
              <ObservedSkinVisualization model={data?.observed ?? buildObservedSkinViewModel(null)} />
            )}
          </Card>
        </View>

        {/* Scan history */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scan History</Text>
          {isLoading && (
            <Text style={styles.loadingText}>Loading scans...</Text>
          )}
          {!isLoading && scans.length === 0 && (
            <EmptyState
              title="No scans yet"
              message="Your FaceAtlas scan history will appear here once you capture your first scan on a physical device."
            />
          )}
          {scans.map((scan) => (
            <Card key={scan.id} style={styles.scanCard}>
              <View style={styles.scanRow}>
                <Text style={styles.scanIcon}>🖼️</Text>
                <View style={styles.scanContent}>
                  <Text style={styles.scanDate}>
                    {new Date(scan.capturedAt).toLocaleDateString()} · {scan.angle.replace(/_/g, " ")}
                  </Text>
                  <Badge
                    label={scan.status}
                    color={["complete", "completed", "analyzed"].includes(scan.status) ? Colors.primaryLight : "#fef3c7"}
                    textColor={["complete", "completed", "analyzed"].includes(scan.status) ? Colors.primary : "#92400e"}
                  />
                </View>
              </View>
            </Card>
          ))}
        </View>

        {/* Info card */}
        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>🔒 Privacy-First Design</Text>
          <Text style={styles.infoText}>
            Raw face images are stored privately in your personal storage bucket.
            They are never shared without your explicit consent. You can delete
            all images at any time from Profile → Privacy.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  header: { marginBottom: Spacing.lg },
  title: { ...Typography.largeTitle, color: Colors.textPrimary },
  subtitle: { ...Typography.body, color: Colors.textSecondary, marginTop: 4 },
  readinessCard: { marginBottom: Spacing.lg },
  readinessRow: { flexDirection: "row", gap: Spacing.md, alignItems: "flex-start" },
  readinessIcon: { fontSize: 28, marginTop: 2 },
  readinessContent: { flex: 1 },
  readinessHeader: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginBottom: 6, flexWrap: "wrap" },
  readinessTitle: { ...Typography.bodyMedium, color: Colors.textPrimary },
  readinessText: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { ...Typography.title3, color: Colors.textPrimary, marginBottom: Spacing.md },
  loadingText: { ...Typography.body, color: Colors.textMuted, textAlign: "center", padding: Spacing.xl },
  scanCard: { marginBottom: Spacing.sm },
  scanRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  scanIcon: { fontSize: 24 },
  scanContent: { flex: 1, gap: 4 },
  scanDate: { ...Typography.bodyMedium, color: Colors.textPrimary },
  observedCard: { alignItems: "stretch" },
  errorText: { ...Typography.caption, color: Colors.error, lineHeight: 18 },
  infoCard: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryMid },
  infoTitle: { ...Typography.bodyMedium, color: Colors.primaryDark, marginBottom: 6 },
  infoText: { ...Typography.caption, color: Colors.primaryDark, lineHeight: 18 },
});
