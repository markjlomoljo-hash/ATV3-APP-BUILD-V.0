// Pure, deterministic report-data compiler. No fabrication: every field is
// derived directly from `RawProfileBundle`, which itself must be populated
// only from real persisted records. When a section has no real data, the
// output explicitly states so instead of omitting or inventing content.
import { randomUUID } from "crypto";
import { ReportInclusionOptions } from "@/types/profile";
import { RawProfileBundle, ReportData, ReportSection } from "./types";

function hasContent(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as object).length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function recordList(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Record<string, unknown> =>
      typeof item === "object" && item !== null && !Array.isArray(item),
  );
}

function sectionValue(
  bundle: RawProfileBundle,
  key: string,
): Record<string, unknown> {
  return bundle.sections[key]?.value ?? {};
}

function insufficient(title: string, note: string): ReportSection {
  return { title, insufficientData: true, insufficientDataNote: note };
}

const ONSET_LABELS: Readonly<Record<string, string>> = {
  acute_recent_onset: "Within the last 6 months",
  subacute_recent_onset: "6–12 months ago",
  persistent_recent_history: "1–2 years ago",
  multi_year_persistent: "3–5 years ago",
  long_term_persistent: "More than 5 years ago",
  adolescent_persistent: "Since early adolescence",
  childhood_onset_history: "Since childhood",
  adult_onset: "Adult-onset after age 18",
  product_temporal_association: "Started after a product/routine change",
  medication_temporal_association: "Started after medication/treatment change",
  lifestyle_environment_temporal_association: "Started after lifestyle/environment change",
  episodic_relapsing: "Comes and goes in episodes",
  unknown_onset: "Not sure",
};

const MEAL_FREQUENCY_LABELS: Readonly<Record<string, string>> = {
  "1": "1 meal per day",
  "2": "2 meals per day",
  "3": "3 meals per day",
  varies: "It varies a lot",
  not_sure: "Not sure",
  prefer_not_to_answer: "Prefer not to answer",
};

function humanizeKey(key: string): string {
  const text = key.replace(/_/g, " ").trim();
  return text.length > 0 ? text[0].toUpperCase() + text.slice(1) : key;
}

function displayPersistedValue(value: unknown): string {
  if (!hasContent(value)) return "Not provided";
  if (Array.isArray(value)) return value.map(displayPersistedValue).join(", ");
  if (typeof value === "object" && value !== null) {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, child]) => `${humanizeKey(key)}: ${displayPersistedValue(child)}`)
      .join("; ");
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function sleepAnalyticsRows(bundle: RawProfileBundle): Array<{ label: string; value: string }> {
  const persisted = bundle.latestSleepAnalytics;
  if (!persisted) return [];
  const snapshot = persisted.snapshot;
  const readiness = snapshot.readiness === "sufficient_data" ? "Sufficient data" : "Insufficient data";
  const rows = [
    { label: "Sleep analytics date", value: persisted.logDate },
    { label: "Sleep analytics readiness", value: readiness },
    { label: "Valid sleep records", value: displayPersistedValue(snapshot.days_logged) },
    { label: "Latest sleep duration", value: typeof snapshot.duration_hours === "number" ? `${snapshot.duration_hours} hours` : "Insufficient data" },
    { label: "7-day sleep debt", value: typeof snapshot.cumulative_debt_7d === "number" ? `${snapshot.cumulative_debt_7d} hours` : "Insufficient data" },
  ];
  if (snapshot.readiness === "sufficient_data") {
    rows.push(
      { label: "Circadian alignment estimate", value: displayPersistedValue(snapshot.circadian_alignment_score) },
      { label: "Nocturnal recovery opportunity estimate", value: displayPersistedValue(snapshot.nocturnal_recovery_opportunity) },
    );
  } else {
    rows.push({
      label: "Circadian and recovery estimates",
      value: "Insufficient data — at least 7 valid sleep records are required",
    });
  }
  rows.push({
    label: "Sleep analytics provenance",
    value: `${persisted.source}; ${persisted.ruleVersion}; computed ${persisted.computedAt}`,
  });
  return rows;
}

export function compileReportData(
  bundle: RawProfileBundle,
  inclusionOptions: ReportInclusionOptions,
): ReportData {
  const reportId = randomUUID();
  const compiledAt = new Date().toISOString();

  const includeSection = (key: string) =>
    inclusionOptions.includeSections === "all" || inclusionOptions.includeSections.includes(key as never);

  // --- Patient summary -----------------------------------------------
  const identity = sectionValue(bundle, "identity");
  const skinProfile = sectionValue(bundle, "skin_profile");
  const patientSummary: ReportSection = {
    title: "Patient Profile Summary",
    insufficientData: false,
    rows: [
      { label: "Name", value: bundle.userName },
      { label: "Member since", value: bundle.memberSince.slice(0, 10) },
      { label: "Skin type", value: String(skinProfile.skinType ?? "Not provided") },
      { label: "Undertone", value: String(skinProfile.undertone ?? "Not provided") },
      {
        label: "Known conditions",
        value: stringList(skinProfile.knownConditions).length > 0
          ? stringList(skinProfile.knownConditions).join(", ")
          : "None reported",
      },
      { label: "Preferred name / notes", value: String(identity.displayName ?? bundle.userName) },
    ],
  };

  // Never infer clinical diagnostic cards from profile answers or lesion
  // counts. These values require validated, governed persisted outputs.
  const currentDiagnostics = insufficient(
    "Current Diagnostics Baseline",
    "A completed FaceAtlas scan with validated CHI, barrier integrity, inflammatory and non-inflammatory lesion, oiliness, confidence, and validation fields is required. These governed diagnostic metrics are not present in the current persisted record schema.",
  );

  // --- Acne history -----------------------------------------------------
  const acneHistory = sectionValue(bundle, "acne_history");
  const structuredOnset = typeof acneHistory.onset_pattern === "string"
    ? acneHistory.onset_pattern
    : null;
  const onsetRows = structuredOnset
    ? [
        {
          label: "When did it start?",
          value: ONSET_LABELS[structuredOnset] ?? structuredOnset,
        },
        { label: "Structured onset", value: structuredOnset },
        {
          label: "Historical interpretation",
          value: displayPersistedValue(acneHistory.onset_interpretation),
        },
        {
          label: "Additional detail",
          value: displayPersistedValue(acneHistory.onset_detail),
        },
      ]
    : [
        { label: "Onset age", value: displayPersistedValue(acneHistory.onsetAge) },
        { label: "Prior severity", value: displayPersistedValue(acneHistory.priorSeverity) },
        { label: "Pattern notes", value: displayPersistedValue(acneHistory.patternNotes) },
      ];
  const acneHistorySection: ReportSection = hasContent(acneHistory)
    ? {
        title: "Acne History & Onset Timeline",
        insufficientData: false,
        rows: onsetRows,
      }
    : insufficient(
        "Acne History & Onset Timeline",
        "No acne history has been recorded yet. Ask the user to complete the Acne History section of their Professional Profile.",
      );

  // --- Skin & barrier -----------------------------------------------------
  const barrier = sectionValue(bundle, "barrier_sensitivity");
  const skinBarrier: ReportSection = hasContent(barrier)
    ? {
        title: "Skin Type, Sensitivity & Barrier Symptoms",
        insufficientData: false,
        rows: [
          {
            label: "Barrier symptoms",
            value: stringList(barrier.barrierSymptoms).length > 0
              ? stringList(barrier.barrierSymptoms).join(", ")
              : "None reported",
          },
          { label: "Tolerance notes", value: String(barrier.toleranceNotes ?? "Not provided") },
        ],
      }
    : insufficient(
        "Skin Type, Sensitivity & Barrier Symptoms",
        "No barrier/sensitivity profile has been recorded yet.",
      );

  // --- Lesion trends (from FaceAtlas scans) -----------------------------
  const lesionTrends: ReportSection =
    bundle.faceAtlasScans.length > 0
      ? {
          title: "Lesion Trends by Scan",
          insufficientData: false,
          table: {
            headers: ["Scan date", "User count", "Model count", "Agreement", "Confidence"],
            rows: bundle.faceAtlasScans
              .slice(0, 12)
              .map((s) => [
                s.scanDate.slice(0, 10),
                s.userLesionCount?.toString() ?? "—",
                s.modelLesionCount?.toString() ?? "—",
                s.agreementPct !== null ? `${s.agreementPct}%` : "—",
                s.confidence,
              ]),
          },
        }
      : insufficient(
          "Lesion Trends by Scan",
          "No FaceAtlas scans on record. At least one completed scan is required to show lesion trends.",
        );

  // --- FaceAtlas history (respects photo-inclusion consent) --------------
  const faceAtlasHistory: ReportSection =
    bundle.faceAtlasScans.length > 0
      ? {
          title: "FaceAtlas Scan History",
          insufficientData: false,
          notes: [
            inclusionOptions.includeFaceAtlasPhotos
              ? "Scan thumbnails included per explicit user consent at report time."
              : "Scan thumbnails excluded — user did not opt in to including FaceAtlas photos in this report.",
            `Total scans on record: ${bundle.faceAtlasScans.length}.`,
          ],
        }
      : insufficient(
          "FaceAtlas Scan History",
          "No FaceAtlas scans on record yet.",
        );

  // --- Routine & products --------------------------------------------------
  const routine = sectionValue(bundle, "routine_inventory");
  const routineProducts: ReportSection = hasContent(routine)
    ? {
        title: "Routine & Product Inventory",
        insufficientData: false,
        rows: [
          {
            label: "AM routine",
            value: stringList(routine.amRoutine).length > 0
              ? stringList(routine.amRoutine).join(", ")
              : "Not provided",
          },
          {
            label: "PM routine",
            value: stringList(routine.pmRoutine).length > 0
              ? stringList(routine.pmRoutine).join(", ")
              : "Not provided",
          },
        ],
      }
    : insufficient("Routine & Product Inventory", "No routine/product inventory has been recorded yet.");

  // --- Medication / treatment history --------------------------------------
  const medHistory = sectionValue(bundle, "medication_treatment_history");
  const medicationHistoryRows = recordList(medHistory.history);
  const medicationTreatmentHistory: ReportSection = medicationHistoryRows.length > 0
    ? {
        title: "Medication & Treatment History",
        insufficientData: false,
        table: {
          headers: ["Treatment", "Started", "Ended", "Outcome"],
          rows: medicationHistoryRows.map((h) => [
            String(h.name ?? "—"),
            String(h.startDate ?? "—"),
            String(h.endDate ?? "Ongoing"),
            String(h.outcome ?? "Not recorded"),
          ]),
        },
      }
    : insufficient(
        "Medication & Treatment History",
        "No medication/treatment history has been recorded yet.",
      );

  // --- Treatment Plan Center summary ---------------------------------------
  const treatmentPlansSection: ReportSection =
    inclusionOptions.includeTreatmentDetails && bundle.treatmentPlans.length > 0
      ? {
          title: "Active & Archived Treatment Plans",
          insufficientData: false,
          table: {
            headers: ["Plan", "Description", "Status", "Started", "Ended", "Schedule"],
            rows: bundle.treatmentPlans.map((p) => [
              p.title,
              p.description ?? "Not recorded",
              p.status,
              p.startedAt ?? "Not recorded",
              p.endedAt ?? "Ongoing",
              p.schedule ? JSON.stringify(p.schedule) : "Not recorded",
            ]),
          },
        }
      : bundle.treatmentPlans.length === 0
        ? insufficient("Active & Archived Treatment Plans", "No treatment plans on record.")
        : insufficient(
            "Active & Archived Treatment Plans",
            "Excluded — user chose not to include treatment plan details in this report.",
          );

  // --- Adherence & tolerance ------------------------------------------------
  const adherenceTolerance: ReportSection =
    bundle.treatmentCheckins.length > 0
      ? {
          title: "Adherence & Tolerance Trajectory",
          insufficientData: false,
          table: {
            headers: ["Date", "Status", "Irritation (0-10)", "Notes"],
            rows: bundle.treatmentCheckins.slice(0, 20).map((c) => [
              c.checkinDate,
              c.status,
              c.irritation !== null ? String(c.irritation) : "—",
              c.notes ?? "",
            ]),
          },
        }
      : insufficient(
          "Adherence & Tolerance Trajectory",
          "No treatment check-ins on record. Adherence cannot be estimated without logged check-ins.",
        );

  // --- Allergies / reactions -------------------------------------------------
  const allergies = sectionValue(bundle, "allergies_reactions");
  const allergiesReactions: ReportSection = hasContent(allergies)
    ? {
        title: "Allergies & Adverse Reactions",
        insufficientData: false,
        rows: [
          {
            label: "Allergies",
            value: stringList(allergies.allergies).length > 0
              ? stringList(allergies.allergies).join(", ")
              : "None reported",
          },
          {
            label: "Adverse reactions",
            value: stringList(allergies.reactions).length > 0
              ? stringList(allergies.reactions).join(", ")
              : "None reported",
          },
        ],
      }
    : insufficient("Allergies & Adverse Reactions", "No allergy/reaction history has been recorded yet.");

  // --- Lifestyle context -------------------------------------------------
  const lifestyle = sectionValue(bundle, "lifestyle_baseline");
  const persistedSleepRows = sleepAnalyticsRows(bundle);
  const lifestyleContext: ReportSection = hasContent(lifestyle) || persistedSleepRows.length > 0
    ? {
        title: "Lifestyle Context (Sleep, Stress, Diet, Cycle, Climate)",
        insufficientData: false,
        rows: [
          ...Object.entries(lifestyle).map(([k, v]) => ({
            label: humanizeKey(k),
            value:
              k === "meal_frequency_baseline" && typeof v === "string"
                ? (MEAL_FREQUENCY_LABELS[v] ?? v)
                : displayPersistedValue(v),
          })),
          ...persistedSleepRows,
        ],
        notes: persistedSleepRows.length > 0
          ? ["SleepDerm values are deterministic estimates from user-entered records, not sleep-stage measurements, diagnoses, or causal skin findings."]
          : undefined,
      }
    : insufficient(
        "Lifestyle Context (Sleep, Stress, Diet, Cycle, Climate)",
        "No lifestyle baseline has been recorded yet.",
      );

  // --- Trigger hypotheses --------------------------------------------------
  const triggerHypotheses: ReportSection =
    bundle.triggerHypotheses.length > 0
      ? {
          title: "Trigger Hypotheses & Validation Status",
          insufficientData: false,
          table: {
            headers: ["Suspected trigger", "Status", "Evidence count", "Notes"],
            rows: bundle.triggerHypotheses.map((t) => [
              t.triggerName,
              t.status.replace(/_/g, " "),
              String(t.evidenceCount),
              t.notes ?? "",
            ]),
          },
          notes: [
            "Trigger status reflects real logged evidence only. Statuses below 'validated' must not be treated as confirmed causes.",
          ],
        }
      : insufficient(
          "Trigger Hypotheses & Validation Status",
          "No trigger hypotheses have been generated yet — more daily logs are required.",
        );

  // --- Forecast summaries --------------------------------------------------
  const forecastSummaries: ReportSection =
    bundle.forecastSummaries.length > 0
      ? {
          title: "Forecast Summaries",
          insufficientData: false,
          table: {
            headers: ["Window", "Status", "Confidence", "Summary"],
            rows: bundle.forecastSummaries.map((f) => [
              f.window,
              f.status.replace(/_/g, " "),
              f.confidence ?? "—",
              f.summary ?? "Insufficient data for this window.",
            ]),
          },
        }
      : insufficient(
          "Forecast Summaries",
          "No forecasts are available yet. Forecasting requires sustained daily logging.",
        );

  const evidenceCitations: ReportSection =
    bundle.evidenceCitations.length > 0
      ? {
          title: "Evidence & Citations",
          insufficientData: false,
          table: {
            headers: ["Evidence", "Source", "URL", "Accessed"],
            rows: bundle.evidenceCitations.map((citation) => [
              citation.title,
              citation.source,
              citation.url ?? "Not recorded",
              citation.accessedAt?.slice(0, 10) ?? "Not recorded",
            ]),
          },
        }
      : insufficient(
          "Evidence & Citations",
          "At least one governed, persisted citation linked to a report finding is required. No persisted citation records are available, so no evidence source is asserted.",
        );

  // --- Confidence notes ------------------------------------------------
  const confidenceNotes: ReportSection = {
    title: "Confidence & Data Sufficiency Notes",
    insufficientData: false,
    notes: [
      `Total daily logs on record: ${bundle.dailyLogCount}.`,
      `Approximate days of logging history: ${bundle.daysOfHistory}.`,
      "All statuses in this report reflect real recorded data only. Sections marked 'Insufficient data' contain no fabricated values.",
      "This report is not a diagnosis and does not replace an in-person dermatology evaluation.",
    ],
  };

  // --- Provider-facing questions ------------------------------------------
  const providerQuestions: ReportSection = {
    title: "Provider-Facing Questions & Topics",
    insufficientData: false,
    notes: [
      "Does the current lesion pattern and history support the patient's suspected trigger hypotheses?",
      "Is the current treatment plan (if any) appropriate given the recorded tolerance/adherence trajectory?",
      "Are any recorded allergies or barrier symptoms relevant to selecting the next treatment step?",
      "What additional data (labs, in-person exam) would materially change guidance beyond what is captured here?",
    ],
  };

  const anyRealData =
    bundle.dailyLogCount > 0 ||
    bundle.faceAtlasScans.length > 0 ||
    bundle.treatmentPlans.length > 0 ||
    Object.values(bundle.sections).some((s) => hasContent(s.value));

  return {
    reportId,
    compiledAt,
    secureRecordStatus: anyRealData ? "verified_user_records" : "no_records_found",
    inclusionOptions,
    patientSummary,
    currentDiagnostics,
    acneHistory: includeSection("acne_history") ? acneHistorySection : insufficient("Acne History & Onset Timeline", "Excluded from this report by user selection."),
    skinBarrier: includeSection("barrier_sensitivity") ? skinBarrier : insufficient("Skin Type, Sensitivity & Barrier Symptoms", "Excluded from this report by user selection."),
    lesionTrends,
    faceAtlasHistory,
    routineProducts: includeSection("routine_inventory") ? routineProducts : insufficient("Routine & Product Inventory", "Excluded from this report by user selection."),
    medicationTreatmentHistory: includeSection("medication_treatment_history") ? medicationTreatmentHistory : insufficient("Medication & Treatment History", "Excluded from this report by user selection."),
    treatmentPlans: treatmentPlansSection,
    adherenceTolerance,
    allergiesReactions: includeSection("allergies_reactions") ? allergiesReactions : insufficient("Allergies & Adverse Reactions", "Excluded from this report by user selection."),
    lifestyleContext: includeSection("lifestyle_baseline") ? lifestyleContext : insufficient("Lifestyle Context (Sleep, Stress, Diet, Cycle, Climate)", "Excluded from this report by user selection."),
    triggerHypotheses,
    forecastSummaries,
    evidenceCitations,
    confidenceNotes,
    providerQuestions,
  };
}
