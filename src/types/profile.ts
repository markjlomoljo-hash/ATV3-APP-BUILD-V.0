// Shared domain types for Phase 7 — Professional Profile & Reports.
// These types are intentionally framework-agnostic (no React Native or
// Next.js imports) so they can be reused verbatim by a native mobile client.

export type ConfidenceLabel =
  | "insufficient_data"
  | "early_hypothesis"
  | "moderate_confidence"
  | "high_confidence"
  | "needs_confirmation"
  | "validated";

export const PROFILE_SECTION_KEYS = [
  "identity",
  "skin_profile",
  "acne_history",
  "severity_tendency",
  "barrier_sensitivity",
  "routine_inventory",
  "medication_treatment_history",
  "allergies_reactions",
  "lifestyle_baseline",
  "trigger_hypotheses_notes",
  "notification_preferences",
] as const;

export type ProfileSectionKey = (typeof PROFILE_SECTION_KEYS)[number];

/** Sections whose edits must be preserved as version history. */
export const VERSIONED_SECTION_KEYS: ProfileSectionKey[] = [
  "acne_history",
  "severity_tendency",
  "barrier_sensitivity",
  "medication_treatment_history",
  "allergies_reactions",
  "lifestyle_baseline",
  "trigger_hypotheses_notes",
  "routine_inventory",
];

export interface ProfileSectionRecord {
  sectionKey: ProfileSectionKey;
  value: Record<string, unknown> | null;
  version: number;
  updatedAt: string | null;
  updatedBy: string | null;
  isVersioned: boolean;
}

export interface ProfileVersionEntry {
  id: string;
  sectionKey: string;
  version: number;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown>;
  changedAt: string;
  actor: string;
  reason: string | null;
  includeInReports: boolean;
}

export interface ConsentSettings {
  anonymousLearning: boolean;
  rawImageLearning: boolean;
  includeFaceAtlasPhotosInReports: boolean;
  includeTreatmentDetailsInReports: boolean;
  marketingNotifications: boolean;
  productAnalysisNotifications: boolean;
  reportReadyNotifications: boolean;
  streakRiskNotifications: boolean;
  weatherAlertNotifications: boolean;
  updatedAt: string | null;
}

export interface FaceAtlasHistorySummary {
  totalScans: number;
  lastScanDate: string | null;
  averageAgreementPct: number | null;
  confidenceTrend: ConfidenceLabel | "insufficient_data";
  scans: Array<{
    id: string;
    scanDate: string;
    userLesionCount: number | null;
    modelLesionCount: number | null;
    agreementPct: number | null;
    confidence: string;
    hasRetainedImage: boolean;
  }>;
  insufficientData: boolean;
}

export interface ModelReadinessSummary {
  totalLogs: number;
  totalScans: number;
  daysOfHistory: number;
  readinessLevel: "locked" | "partial" | "available";
  missingForNextLevel: string[];
}

export interface GamificationSummary {
  currentStreak: number;
  longestStreak: number;
  totalPoints: number;
  badgeCount: number;
  badges: string[];
  insufficientData: boolean;
}

export interface TreatmentSummary {
  activePlans: number;
  archivedPlans: number;
  lastCheckinDate: string | null;
  adherenceRatePct: number | null;
  insufficientData: boolean;
}

export interface ProfessionalProfile {
  userId: string;
  identity: { email: string; name: string; memberSince: string };
  sections: ProfileSectionRecord[];
  consent: ConsentSettings;
  faceAtlasSummary: FaceAtlasHistorySummary;
  modelReadiness: ModelReadinessSummary;
  gamification: GamificationSummary;
  treatmentSummary: TreatmentSummary;
}

export type ReportInclusionOptions = {
  includeFaceAtlasPhotos: boolean;
  includeTreatmentDetails: boolean;
  includeSections: ProfileSectionKey[] | "all";
};

export type ReportRequestStatus = "queued" | "processing" | "completed" | "failed";

export interface ReportMetadata {
  id: string;
  requestedAt: string;
  status: ReportRequestStatus;
  inclusionOptions: ReportInclusionOptions;
  fileSizeBytes: number | null;
  failureReason: string | null;
}

export type ExportFormat = "json" | "csv";
export type ExportScope =
  | "profile"
  | "logs"
  | "scans"
  | "treatment_plans"
  | "tasks"
  | "weather"
  | "reports"
  | "consents"
  | "all";

export type ExportRequestStatus = "queued" | "processing" | "completed" | "failed";

export interface ExportMetadata {
  id: string;
  format: ExportFormat;
  scope: ExportScope;
  status: ExportRequestStatus;
  requestedAt: string;
  fileSizeBytes: number | null;
}

export type DeletionType = "account" | "data" | "faceatlas_only" | "logs_only" | "reports_only";
export type DeletionStatus = "pending" | "scheduled" | "cancelled" | "completed";

export interface DeletionRequestRecord {
  id: string;
  type: DeletionType;
  status: DeletionStatus;
  requestedAt: string;
  scheduledPurgeAt: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  exportRequestedFirst: boolean;
}

/** Retention window (days) before a "pending" deletion becomes irreversible. */
export const DELETION_RETENTION_WINDOW_DAYS = 14;
