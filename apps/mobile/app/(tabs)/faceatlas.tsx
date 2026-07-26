import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../src/stores/auth";
import { Button, Card, EmptyState, Badge } from "../../src/components/ui";
import { Colors, Spacing, Typography } from "../../src/components/ui/theme";
import {
  fetchFaceAtlasScanSummaries,
  fetchFaceScans,
  type FaceAtlasScanSummary,
  type FaceScanRecord,
} from "../../src/lib/faceatlas-service";
import {
  confidenceBadge,
  mergeScanTimeline,
  statusBadge,
} from "../../src/lib/faceatlas-history";

function CaptureRow({ scan }: { scan: FaceScanRecord }) {
  const badge = statusBadge(scan.status);
  // Speak only from known server state: a null storage_path means the scan
  // record references no image — it does NOT prove no image exists (mobile
  // uploads land in the private bucket without a registration contract), so
  // we never claim "no raw image stored".
  const storageLine = scan.raw_image_deleted_at
    ? "Raw image deleted"
    : scan.storage_path
      ? "Image registered in your private storage"
      : "No image registered on this scan record";
  return (
    <Card style={styles.scanCard}>
      <View style={styles.scanRow}>
        <Text style={styles.scanIcon}>📷</Text>
        <View style={styles.scanContent}>
          <View style={styles.scanHeader}>
            <Text style={styles.scanDate}>
              {new Date(scan.captured_at).toLocaleDateString()}
              {scan.angle ? ` · ${scan.angle}` : ""}
            </Text>
            <Badge label={scan.status} color={badge.color} textColor={badge.textColor} />
          </View>
          <Text style={styles.scanDetail}>{storageLine}</Text>
          {scan.image_quality !== null && (
            <Text style={styles.scanDetail}>Image quality: {scan.image_quality}</Text>
          )}
          {scan.oiliness_estimate !== null && (
            <Text style={styles.scanDetail}>
              Oiliness estimate: {scan.oiliness_estimate}
            </Text>
          )}
        </View>
      </View>
    </Card>
  );
}

function SummaryRow({ scan }: { scan: FaceAtlasScanSummary }) {
  // Explicit confidence-vocabulary mapping — an unknown confidence value
  // renders neutral, never green (see faceatlas-history.ts).
  const badge = confidenceBadge(scan.confidence);
  return (
    <Card style={styles.scanCard}>
      <View style={styles.scanRow}>
        <Text style={styles.scanIcon}>🖼️</Text>
        <View style={styles.scanContent}>
          <View style={styles.scanHeader}>
            <Text style={styles.scanDate}>
              {new Date(scan.scan_date).toLocaleDateString()}
            </Text>
            <Badge label={scan.confidence} color={badge.color} textColor={badge.textColor} />
          </View>
          {scan.user_lesion_count !== null && (
            <Text style={styles.scanDetail}>
              Your lesion count: {scan.user_lesion_count}
            </Text>
          )}
          {scan.model_lesion_count !== null && (
            <Text style={styles.scanDetail}>
              Model lesion count: {scan.model_lesion_count}
            </Text>
          )}
          {scan.agreement_pct !== null && (
            <Text style={styles.scanDetail}>
              Agreement: {Math.round(scan.agreement_pct)}%
            </Text>
          )}
          {scan.oiliness_user !== null && (
            <Text style={styles.scanDetail}>Oiliness (you): {scan.oiliness_user}</Text>
          )}
          {scan.oiliness_model !== null && (
            <Text style={styles.scanDetail}>
              Oiliness (model): {scan.oiliness_model}
            </Text>
          )}
        </View>
      </View>
    </Card>
  );
}

export default function FaceAtlasScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const {
    data: captures = [],
    isLoading: loadingCaptures,
    error: capturesError,
  } = useQuery({
    queryKey: ["face-scans", user?.id],
    queryFn: () => fetchFaceScans(user!.id),
    enabled: !!user,
  });

  const {
    data: summaries = [],
    isLoading: loadingSummaries,
    error: summariesError,
  } = useQuery({
    queryKey: ["face-atlas-scans", user?.id],
    queryFn: () => fetchFaceAtlasScanSummaries(user!.id),
    enabled: !!user,
  });

  const isLoading = loadingCaptures || loadingSummaries;
  const isEmpty = !isLoading && captures.length === 0 && summaries.length === 0;
  const timeline = mergeScanTimeline(captures, summaries);
  const startCapture = () => router.push("/faceatlas/capture" as never);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>FaceAtlas</Text>
          <Text style={styles.subtitle}>
            Capture and track your skin over time with guided photo capture.
          </Text>
        </View>

        <Button
          title="Start guided capture"
          onPress={startCapture}
          style={{ marginBottom: Spacing.lg }}
        />

        {/* Scan history — one dated timeline across both scan tables */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scan History</Text>
          {isLoading && <Text style={styles.loadingText}>Loading scans...</Text>}
          {(capturesError || summariesError) && (
            <Card style={styles.errorCard}>
              <Text style={styles.errorText}>
                Scan history could not be loaded:{" "}
                {capturesError instanceof Error
                  ? capturesError.message
                  : summariesError instanceof Error
                    ? summariesError.message
                    : "unknown_error"}
              </Text>
            </Card>
          )}
          {isEmpty && (
            <EmptyState
              title="No scans yet"
              message="Run a guided capture to record your first FaceAtlas scan. Capture runs on-device quality checks on photo metadata only and saves scan records with the honest status pending_upload — automated lesion analysis is not active yet, so no analysis results will appear until server-side processing ships."
              action={{ label: "Start guided capture", onPress: startCapture }}
            />
          )}
          {timeline.map((entry) =>
            entry.kind === "capture" ? (
              <CaptureRow key={`capture-${entry.scan.id}`} scan={entry.scan} />
            ) : (
              <SummaryRow key={`summary-${entry.scan.id}`} scan={entry.scan} />
            )
          )}
        </View>

        {/* Info card */}
        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>🔒 Privacy-First Design</Text>
          <Text style={styles.infoText}>
            Photos are uploaded to your private storage bucket only when your
            raw-image retention consent is recorded; without it, photos never
            leave this device and only scan records (metadata) are created.
            Today the pipeline stores captures — it does not run automated
            lesion analysis, and scan records honestly stay pending_upload
            until server-side processing exists. Withdrawing consent in
            Profile → Privacy &amp; Consent stops future uploads; in-app
            deletion of already-stored images is not available yet, and you
            can request account deletion from the Profile tab.
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
  section: { marginBottom: Spacing.lg },
  sectionTitle: { ...Typography.title3, color: Colors.textPrimary, marginBottom: Spacing.md },
  loadingText: { ...Typography.body, color: Colors.textMuted, textAlign: "center", padding: Spacing.xl },
  errorCard: { marginBottom: Spacing.sm, borderColor: "#fecaca", backgroundColor: "#fef2f2" },
  errorText: { ...Typography.caption, color: Colors.error, lineHeight: 18 },
  scanCard: { marginBottom: Spacing.sm },
  scanRow: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.md },
  scanIcon: { fontSize: 24 },
  scanContent: { flex: 1, gap: 4 },
  scanHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  scanDate: { ...Typography.bodyMedium, color: Colors.textPrimary },
  scanDetail: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
  infoCard: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryMid },
  infoTitle: { ...Typography.bodyMedium, color: Colors.primaryDark, marginBottom: 6 },
  infoText: { ...Typography.caption, color: Colors.primaryDark, lineHeight: 18 },
});
