import { Image, StyleSheet, Text, View } from "react-native";
import type {
  ObservedSkinViewModel,
  SkinTwinProjectionViewModel,
} from "../lib/faceatlas-visualization";
import { BorderRadius, Colors, Spacing, Typography } from "./ui/theme";

const FULL_WIDTH = 240;
const FULL_HEIGHT = 300;
const COMPACT_WIDTH = 124;
const COMPACT_HEIGHT = 164;

function markerColor(source: "user" | "model"): string {
  return source === "user" ? "#c2410c" : "#7c3aed";
}

export function ObservedSkinVisualization({
  model,
  compact = false,
}: {
  model: ObservedSkinViewModel;
  compact?: boolean;
}) {
  const width = compact ? COMPACT_WIDTH : FULL_WIDTH;
  const height = compact ? COMPACT_HEIGHT : FULL_HEIGHT;
  if (model.status === "insufficient_data") {
    return (
      <View style={styles.insufficientPanel}>
        <Text style={styles.panelLabel}>{model.label}</Text>
        <Text style={styles.insufficientText}>{model.limitation}</Text>
      </View>
    );
  }
  return (
    <View style={styles.visualizationPanel}>
      <Text style={styles.panelLabel}>{model.label}</Text>
      <Text style={styles.metaText}>
        {model.scanTime ? new Date(model.scanTime).toLocaleString() : "Scan time unavailable"} · {model.angle ?? "angle unavailable"}
      </Text>
      <View style={[styles.canvas, { width, height }]}>
        {model.rawImageUri ? (
          <Image source={{ uri: model.rawImageUri }} style={styles.rawImage} resizeMode="cover" />
        ) : (
          <>
            <View style={styles.faceOval} />
            <Text style={[styles.zoneLabel, { top: height * 0.14 }]}>forehead</Text>
            <Text style={[styles.zoneLabel, { top: height * 0.43, left: width * 0.08 }]}>L cheek</Text>
            <Text style={[styles.zoneLabel, { top: height * 0.43, right: width * 0.08 }]}>R cheek</Text>
            <Text style={[styles.zoneLabel, { top: height * 0.76 }]}>chin</Text>
          </>
        )}
        {model.markers.map((marker) => {
          const markerWidth = Math.max(7, (marker.w ?? 0.035) * width);
          const markerHeight = Math.max(7, (marker.h ?? 0.035) * height);
          return (
            <View
              key={marker.id}
              accessible
              accessibilityLabel={`${marker.lesionType}, ${marker.zone ?? "zone unassigned"}, ${marker.source} marker${marker.certainty === null ? ", certainty unrecorded" : `, ${Math.round(marker.certainty * 100)} percent certainty`}`}
              style={[
                styles.marker,
                {
                  backgroundColor: markerColor(marker.source),
                  width: markerWidth,
                  height: markerHeight,
                  left: Math.max(0, Math.min(width - markerWidth, marker.x * width)),
                  top: Math.max(0, Math.min(height - markerHeight, marker.y * height)),
                },
              ]}
            />
          );
        })}
      </View>
      {!compact && (
        <>
          <View style={styles.legendRow}>
            <Text style={styles.userLegend}>● User</Text>
            <Text style={styles.modelLegend}>● Model</Text>
            <Text style={styles.metaText}>{model.markers.length} persisted markers</Text>
          </View>
          <Text style={styles.detailText}>
            Inflammatory: {model.inflammatoryCount} · Non-inflammatory: {model.nonInflammatoryCount} · Uncertain: {model.uncertainCount}
          </Text>
          {model.zoneCounts.length > 0 && (
            <View style={styles.zoneChips}>
              {model.zoneCounts.map((zone) => (
                <Text key={zone.zone} style={styles.zoneChip}>{zone.zone.replace(/_/g, " ")}: {zone.count}</Text>
              ))}
            </View>
          )}
          <Text style={styles.detailText}>{model.sourceSummary}</Text>
          {model.qualityWarning && <Text style={styles.warningText}>{model.qualityWarning}</Text>}
          <Text style={styles.limitationText}>{model.limitation}</Text>
        </>
      )}
    </View>
  );
}

export function EstimatedProjectionVisualization({
  model,
  compact = false,
}: {
  model: SkinTwinProjectionViewModel;
  compact?: boolean;
}) {
  return (
    <View style={styles.visualizationPanel}>
      <Text style={styles.panelLabel}>{model.label}</Text>
      <View style={[styles.projectionCanvas, compact && styles.projectionCanvasCompact]}>
        <Text style={styles.projectionWindow}>{model.window.replace(/_/g, " ")}</Text>
        <Text style={styles.projectionDirection}>
          {model.direction ?? "Projection unavailable"}
        </Text>
        {model.zoneDirections.map((zone) => (
          <Text key={zone.zone} style={styles.zoneChip}>
            {zone.zone.replace(/_/g, " ")}: {zone.direction}
          </Text>
        ))}
        <Text style={styles.metaText}>Confidence: {model.confidence.replace(/_/g, " ")}</Text>
        {!compact && <Text style={styles.metaText}>Uncertainty: {model.uncertainty ?? "insufficient data"}</Text>}
      </View>
      {!compact && (
        <>
          <Text style={styles.detailText}>{model.dataSufficiency}</Text>
          <Text style={styles.limitationText}>{model.explanation}</Text>
          <Text style={styles.disclaimerText}>{model.disclaimer}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  visualizationPanel: { alignItems: "center", gap: Spacing.sm },
  insufficientPanel: { padding: Spacing.md, backgroundColor: Colors.background, borderRadius: BorderRadius.md },
  insufficientText: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18 },
  panelLabel: { ...Typography.bodyMedium, color: Colors.textPrimary, alignSelf: "stretch" },
  metaText: { ...Typography.caption, color: Colors.textMuted },
  canvas: { overflow: "hidden", borderRadius: BorderRadius.full, backgroundColor: "#f4e8df", borderWidth: 1, borderColor: "#d6c2b4" },
  rawImage: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  faceOval: { position: "absolute", left: "12%", right: "12%", top: "4%", bottom: "4%", borderRadius: BorderRadius.full, backgroundColor: "#ead5c7", borderWidth: 1, borderColor: "#cbaF9d" },
  zoneLabel: { position: "absolute", alignSelf: "center", width: "100%", textAlign: "center", ...Typography.caption, color: "#806b60", fontSize: 9 },
  marker: { position: "absolute", borderRadius: BorderRadius.full, borderWidth: 1, borderColor: "#ffffff" },
  legendRow: { flexDirection: "row", gap: Spacing.md, alignItems: "center", flexWrap: "wrap", justifyContent: "center" },
  userLegend: { ...Typography.caption, color: "#c2410c" },
  modelLegend: { ...Typography.caption, color: "#7c3aed" },
  detailText: { ...Typography.caption, color: Colors.textSecondary, lineHeight: 18, alignSelf: "stretch" },
  warningText: { ...Typography.caption, color: Colors.warning, lineHeight: 18, alignSelf: "stretch" },
  limitationText: { ...Typography.caption, color: Colors.textMuted, fontStyle: "italic", lineHeight: 18, alignSelf: "stretch" },
  zoneChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" },
  zoneChip: { ...Typography.caption, color: Colors.primaryDark, backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.sm, paddingHorizontal: 6, paddingVertical: 3 },
  projectionCanvas: { minHeight: 180, alignSelf: "stretch", padding: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: "#eef5f2", borderWidth: 1, borderColor: Colors.primaryMid, alignItems: "center", justifyContent: "center", gap: Spacing.sm },
  projectionCanvasCompact: { minHeight: COMPACT_HEIGHT, padding: Spacing.sm },
  projectionWindow: { ...Typography.caption, color: Colors.textMuted, textTransform: "uppercase" },
  projectionDirection: { ...Typography.bodyMedium, color: Colors.primaryDark, textAlign: "center" },
  disclaimerText: { ...Typography.caption, color: Colors.primaryDark, fontStyle: "italic", alignSelf: "stretch" },
});
