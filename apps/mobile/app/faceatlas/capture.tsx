/**
 * FaceAtlas Guided Capture
 *
 * Five-angle guided camera capture with:
 * - honest consent gating (raw-image consent from consent_settings)
 * - honest camera-permission states (including permanently denied)
 * - deterministic local quality checks on real capture metadata
 * - persistence through the backend pending_upload contract, with a
 *   consent-gated raw-image upload to the private face-scans-raw bucket.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { CameraView, useCameraPermissions } from "expo-camera";
import { File } from "expo-file-system";
import { openSettings } from "expo-linking";
import { useAuthStore } from "../../src/stores/auth";
import { Button, Card, Badge } from "../../src/components/ui";
import {
  Colors,
  Spacing,
  Typography,
  BorderRadius,
} from "../../src/components/ui/theme";
import {
  REQUIRED_FACE_ANGLES,
  QUALITY_ISSUE_GUIDANCE,
  assessCaptureQuality,
  fetchFaceCaptureConsent,
  submitFaceCapture,
  type CapturedAngle,
  type CaptureSubmissionResult,
  type FaceAngle,
  type FaceCaptureConsent,
} from "../../src/lib/faceatlas-service";

const ANGLE_GUIDANCE: Record<FaceAngle, { title: string; instruction: string }> = {
  front: {
    title: "Front",
    instruction: "Face the camera directly with your whole face inside the frame.",
  },
  left_45: {
    title: "Left 45°",
    instruction: "Turn your head 45° to the left so your right cheek faces the camera.",
  },
  right_45: {
    title: "Right 45°",
    instruction: "Turn your head 45° to the right so your left cheek faces the camera.",
  },
  forehead_upper: {
    title: "Upper forehead",
    instruction: "Tilt your chin down and lift hair away so your forehead is visible.",
  },
  chin_lower: {
    title: "Chin and jawline",
    instruction: "Tilt your head back slightly so your chin and jawline are visible.",
  },
};

interface PendingCapture extends CapturedAngle {
  uri: string;
}

type Phase =
  | "loading_consent"
  | "consent_absent"
  | "consent_error"
  | "capture"
  | "review"
  | "submitting"
  | "done";

export default function FaceAtlasCaptureScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [permission, requestPermission] = useCameraPermissions();

  const [phase, setPhase] = useState<Phase>("loading_consent");
  const [consent, setConsent] = useState<FaceCaptureConsent | null>(null);
  const [consentError, setConsentError] = useState<string | null>(null);
  const [captures, setCaptures] = useState<PendingCapture[]>([]);
  const [pendingReview, setPendingReview] = useState<PendingCapture | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [analysisConsentGiven, setAnalysisConsentGiven] = useState(false);
  const [submission, setSubmission] = useState<CaptureSubmissionResult | null>(null);
  const [cameraRef, setCameraRef] = useState<CameraView | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchFaceCaptureConsent(user.id)
      .then((result) => {
        if (cancelled) return;
        setConsent(result);
        setPhase(result.rawImageLearning ? "capture" : "consent_absent");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setConsentError(error instanceof Error ? error.message : "unknown_error");
        setPhase("consent_error");
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const currentAngle: FaceAngle | null =
    captures.length < REQUIRED_FACE_ANGLES.length
      ? REQUIRED_FACE_ANGLES[captures.length]
      : null;

  const reviewQuality = useMemo(() => {
    if (!pendingReview) return null;
    return assessCaptureQuality(
      [...captures, pendingReview].map((capture) => capture.metadata)
    );
  }, [captures, pendingReview]);

  const pendingIssueCodes = useMemo(() => {
    if (!reviewQuality || !pendingReview) return [];
    return (
      reviewQuality.issues.find(
        (issue) => issue.angle === pendingReview.metadata.angle
      )?.codes ?? []
    );
  }, [reviewQuality, pendingReview]);

  const takePicture = useCallback(async () => {
    if (!cameraRef || !currentAngle || capturing) return;
    setCapturing(true);
    setCaptureError(null);
    try {
      const photo = await cameraRef.takePictureAsync({ quality: 0.7 });
      const file = new File(photo.uri);
      const bytes = file.exists ? await file.bytes() : null;
      setPendingReview({
        uri: photo.uri,
        capturedAt: new Date().toISOString(),
        bytes,
        metadata: {
          angle: currentAngle,
          width: photo.width,
          height: photo.height,
          bytes: bytes ? bytes.byteLength : 0,
        },
      });
    } catch (error) {
      setCaptureError(error instanceof Error ? error.message : "capture_failed");
    } finally {
      setCapturing(false);
    }
  }, [cameraRef, currentAngle, capturing]);

  const acceptPendingCapture = useCallback(() => {
    if (!pendingReview) return;
    const next = [...captures, pendingReview];
    setCaptures(next);
    setPendingReview(null);
    if (next.length >= REQUIRED_FACE_ANGLES.length) setPhase("review");
  }, [captures, pendingReview]);

  const submit = useCallback(async () => {
    if (!user || !consent || !analysisConsentGiven) return;
    setPhase("submitting");
    try {
      const result = await submitFaceCapture({
        userId: user.id,
        captures,
        analysisConsent: true,
        consent,
      });
      setSubmission(result);
    } catch (error) {
      setSubmission({
        quality: assessCaptureQuality(captures.map((c) => c.metadata)),
        results: [],
        allCreated: false,
      });
      setCaptureError(error instanceof Error ? error.message : "submit_failed");
    } finally {
      queryClient.invalidateQueries({ queryKey: ["face-scans", user.id] });
      queryClient.invalidateQueries({ queryKey: ["face-atlas-scans", user.id] });
      setPhase("done");
    }
  }, [user, consent, analysisConsentGiven, captures, queryClient]);

  // ── Consent states ──────────────────────────────────────────────────────────

  if (phase === "loading_consent") {
    return (
      <Screen title="Guided Capture">
        <Text style={styles.mutedText}>Checking your consent settings...</Text>
      </Screen>
    );
  }

  if (phase === "consent_error") {
    return (
      <Screen title="Guided Capture">
        <Card style={styles.blockCard}>
          <Text style={styles.blockTitle}>Consent check unavailable</Text>
          <Text style={styles.blockText}>
            Your consent settings could not be loaded, so capture cannot start.
            ({consentError})
          </Text>
          <Button title="Back" variant="secondary" onPress={() => router.back()} />
        </Card>
      </Screen>
    );
  }

  if (phase === "consent_absent") {
    return (
      <Screen title="Guided Capture">
        <Card style={styles.blockCard}>
          <Text style={styles.blockTitle}>Raw-image consent required</Text>
          <Text style={styles.blockText}>
            FaceAtlas capture takes photos of your face. You have not enabled
            the &quot;Raw Image Learning&quot; consent, so capture is not
            available. You can enable it in Profile → Privacy &amp; Consent,
            then come back here.
          </Text>
          <Button
            title="Open Profile"
            onPress={() => router.push("/(tabs)/profile" as never)}
            style={{ marginBottom: Spacing.sm }}
          />
          <Button title="Back" variant="secondary" onPress={() => router.back()} />
        </Card>
      </Screen>
    );
  }

  // ── Camera permission states ────────────────────────────────────────────────

  if (!permission) {
    return (
      <Screen title="Guided Capture">
        <Text style={styles.mutedText}>Checking camera permission...</Text>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen title="Guided Capture">
        <Card style={styles.blockCard}>
          <Text style={styles.blockTitle}>Camera access needed</Text>
          <Text style={styles.blockText}>
            {permission.canAskAgain
              ? "FaceAtlas needs the camera to capture your five guided angles. Photos stay in your private storage."
              : "Camera access is denied for AcneTrex. To use FaceAtlas capture, enable the camera permission in your device settings."}
          </Text>
          {permission.canAskAgain ? (
            <Button title="Allow camera" onPress={() => requestPermission()} />
          ) : (
            <Button title="Open device settings" onPress={() => openSettings()} />
          )}
          <Button
            title="Back"
            variant="secondary"
            onPress={() => router.back()}
            style={{ marginTop: Spacing.sm }}
          />
        </Card>
      </Screen>
    );
  }

  // ── Done ────────────────────────────────────────────────────────────────────

  if (phase === "done" && submission) {
    return (
      <Screen title="Capture Result">
        <ScrollView showsVerticalScrollIndicator={false}>
          {captureError && (
            <Card style={styles.blockCard}>
              <Text style={styles.blockTitle}>Save failed</Text>
              <Text style={styles.blockText}>{captureError}</Text>
            </Card>
          )}
          <Card style={styles.resultCard}>
            <Text style={styles.sectionTitle}>Local quality check</Text>
            <Badge
              label={submission.quality.state}
              color={submission.quality.state === "ready" ? Colors.primaryLight : "#fef3c7"}
              textColor={submission.quality.state === "ready" ? Colors.primary : "#92400e"}
            />
            {submission.quality.limitations.map((limitation) => (
              <Text key={limitation} style={styles.limitationText}>
                {limitation}
              </Text>
            ))}
          </Card>
          {submission.results.map((result) => (
            <Card key={result.angle} style={styles.resultCard}>
              <View style={styles.resultRow}>
                <Text style={styles.resultAngle}>
                  {ANGLE_GUIDANCE[result.angle].title}
                </Text>
                {result.scanId ? (
                  <Badge label={result.scanStatus ?? "unknown"} color="#fef3c7" textColor="#92400e" />
                ) : (
                  <Badge label="not_saved" color="#fee2e2" textColor={Colors.error} />
                )}
              </View>
              {result.error && (
                <Text style={styles.resultError}>{result.error}</Text>
              )}
              {result.upload && (
                <Text style={styles.resultDetail}>
                  {result.upload.state === "stored"
                    ? "Image uploaded to your private storage bucket. The scan record does not reference the upload — server-side registration does not happen automatically yet — so scan history will show no registered image for it."
                    : result.upload.state === "skipped_consent_absent"
                      ? "Image kept on this device only — raw-image retention consent is not recorded, so no upload was attempted."
                      : `Image upload failed: ${result.upload.error ?? "unknown_error"}`}
                </Text>
              )}
            </Card>
          ))}
          <Button
            title="Back to FaceAtlas"
            onPress={() => router.back()}
            style={{ marginTop: Spacing.md }}
          />
        </ScrollView>
      </Screen>
    );
  }

  // ── Final review + consent acknowledgment ──────────────────────────────────

  if (phase === "review" || phase === "submitting") {
    const quality = assessCaptureQuality(captures.map((c) => c.metadata));
    return (
      <Screen title="Review Scan">
        <ScrollView showsVerticalScrollIndicator={false}>
          <Card style={styles.resultCard}>
            <Text style={styles.sectionTitle}>Local quality check</Text>
            <Badge
              label={quality.state}
              color={quality.state === "ready" ? Colors.primaryLight : "#fef3c7"}
              textColor={quality.state === "ready" ? Colors.primary : "#92400e"}
            />
            {quality.issues.map((issue) => (
              <Text key={issue.angle} style={styles.resultDetail}>
                {ANGLE_GUIDANCE[issue.angle].title}: {issue.codes.join(", ")}
              </Text>
            ))}
            {quality.limitations.map((limitation) => (
              <Text key={limitation} style={styles.limitationText}>
                {limitation}
              </Text>
            ))}
          </Card>

          <View style={styles.thumbRow}>
            {captures.map((capture) => (
              <Image
                key={capture.metadata.angle}
                source={{ uri: capture.uri }}
                style={styles.thumb}
              />
            ))}
          </View>

          <Card
            style={{
              ...styles.consentCard,
              ...(analysisConsentGiven ? styles.consentCardActive : {}),
            }}
            onPress={() => setAnalysisConsentGiven((given) => !given)}
          >
            <Text style={styles.consentCheck}>
              {analysisConsentGiven ? "☑" : "☐"} I consent to this scan being
              stored and queued for analysis.
            </Text>
          </Card>
          {!consent?.rawImageRetention && (
            <Text style={styles.limitationText}>
              Raw-image retention consent is not recorded for your account, so
              the photos will not be uploaded; only the scan records are
              created (status pending_upload).
            </Text>
          )}

          <Button
            title="Save scan"
            onPress={submit}
            loading={phase === "submitting"}
            disabled={!analysisConsentGiven}
            style={{ marginTop: Spacing.md }}
          />
          <Button
            title="Start over"
            variant="secondary"
            onPress={() => {
              setCaptures([]);
              setPendingReview(null);
              setAnalysisConsentGiven(false);
              setPhase("capture");
            }}
            style={{ marginTop: Spacing.sm }}
          />
        </ScrollView>
      </Screen>
    );
  }

  // ── Per-photo review (quality gate) ─────────────────────────────────────────

  if (pendingReview && reviewQuality) {
    const failed = pendingIssueCodes.length > 0;
    return (
      <Screen title={`${ANGLE_GUIDANCE[pendingReview.metadata.angle].title} — Review`}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Image source={{ uri: pendingReview.uri }} style={styles.preview} />
          {failed ? (
            <Card style={styles.blockCard}>
              <Text style={styles.blockTitle}>Quality check found issues</Text>
              {pendingIssueCodes.map((code) => (
                <Text key={code} style={styles.blockText}>
                  • {QUALITY_ISSUE_GUIDANCE[code] ?? code}
                </Text>
              ))}
              <Text style={styles.limitationText}>
                Local checks assess capture metadata only; they do not detect
                or classify lesions.
              </Text>
            </Card>
          ) : (
            <Card style={styles.resultCard}>
              <Text style={styles.sectionTitle}>Metadata checks passed</Text>
              <Text style={styles.limitationText}>
                Local checks assess capture metadata only; they do not detect
                or classify lesions.
              </Text>
            </Card>
          )}
          <Button
            title="Retake"
            variant={failed ? "primary" : "secondary"}
            onPress={() => setPendingReview(null)}
            style={{ marginTop: Spacing.md }}
          />
          <Button
            title={failed ? "Keep anyway (marked partial)" : "Use this photo"}
            variant={failed ? "secondary" : "primary"}
            onPress={acceptPendingCapture}
            style={{ marginTop: Spacing.sm }}
          />
        </ScrollView>
      </Screen>
    );
  }

  // ── Capture ─────────────────────────────────────────────────────────────────

  return (
    <Screen title="Guided Capture">
      {currentAngle && (
        <>
          <View style={styles.stepRow}>
            {REQUIRED_FACE_ANGLES.map((angle, index) => (
              <View
                key={angle}
                style={[
                  styles.stepDot,
                  index < captures.length && styles.stepDotDone,
                  angle === currentAngle && styles.stepDotActive,
                ]}
              />
            ))}
          </View>
          <Text style={styles.angleTitle}>
            {captures.length + 1} of {REQUIRED_FACE_ANGLES.length}:{" "}
            {ANGLE_GUIDANCE[currentAngle].title}
          </Text>
          <Text style={styles.angleInstruction}>
            {ANGLE_GUIDANCE[currentAngle].instruction}
          </Text>
          <View style={styles.cameraWrap}>
            <CameraView
              ref={setCameraRef}
              style={styles.camera}
              facing="front"
            />
            {/* Guided framing overlay */}
            <View pointerEvents="none" style={styles.overlay}>
              <View style={styles.faceGuide} />
            </View>
          </View>
          {captureError && <Text style={styles.errorText}>{captureError}</Text>}
          <Button
            title="Capture"
            onPress={takePicture}
            loading={capturing}
            style={{ marginTop: Spacing.md }}
          />
          <Button
            title="Cancel"
            variant="ghost"
            onPress={() => router.back()}
            style={{ marginTop: Spacing.xs }}
          />
        </>
      )}
    </Screen>
  );
}

function Screen({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1, padding: Spacing.lg },
  title: {
    ...Typography.title2,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  mutedText: { ...Typography.body, color: Colors.textMuted },
  blockCard: { marginBottom: Spacing.md, gap: Spacing.sm },
  blockTitle: { ...Typography.bodyMedium, color: Colors.textPrimary },
  blockText: { ...Typography.body, color: Colors.textSecondary, lineHeight: 20 },
  stepRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.gray300,
  },
  stepDotDone: { backgroundColor: Colors.primaryMid },
  stepDotActive: { backgroundColor: Colors.primary },
  angleTitle: { ...Typography.title3, color: Colors.textPrimary },
  angleInstruction: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  cameraWrap: {
    aspectRatio: 3 / 4,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    backgroundColor: Colors.gray900,
  },
  camera: { flex: 1 },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  faceGuide: {
    width: "68%",
    height: "78%",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.85)",
    borderRadius: 9999,
    borderStyle: "dashed",
  },
  preview: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.gray200,
    marginBottom: Spacing.md,
  },
  errorText: { ...Typography.caption, color: Colors.error, marginTop: Spacing.sm },
  sectionTitle: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  resultCard: { marginBottom: Spacing.md, gap: 6 },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  resultAngle: { ...Typography.bodyMedium, color: Colors.textPrimary },
  resultDetail: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
  resultError: { ...Typography.caption, color: Colors.error },
  limitationText: {
    ...Typography.caption,
    color: Colors.textMuted,
    lineHeight: 18,
    marginTop: 4,
  },
  thumbRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    flexWrap: "wrap",
  },
  thumb: {
    width: 56,
    height: 74,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.gray200,
  },
  consentCard: { marginBottom: Spacing.sm },
  consentCardActive: { borderColor: Colors.primary },
  consentCheck: { ...Typography.body, color: Colors.textPrimary, lineHeight: 20 },
});
