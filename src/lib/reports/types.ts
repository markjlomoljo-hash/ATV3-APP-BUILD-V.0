import { ReportInclusionOptions } from "@/types/profile";

export interface ReportKeyValueRow {
  label: string;
  value: string;
}

export interface ReportSection {
  title: string;
  insufficientData: boolean;
  insufficientDataNote?: string;
  rows?: ReportKeyValueRow[];
  table?: { headers: string[]; rows: string[][] };
  notes?: string[];
}

export interface ReportData {
  reportId: string;
  compiledAt: string;
  secureRecordStatus: "verified_user_records" | "no_records_found";
  inclusionOptions: ReportInclusionOptions;
  patientSummary: ReportSection;
  acneHistory: ReportSection;
  skinBarrier: ReportSection;
  lesionTrends: ReportSection;
  faceAtlasHistory: ReportSection;
  routineProducts: ReportSection;
  medicationTreatmentHistory: ReportSection;
  treatmentPlans: ReportSection;
  adherenceTolerance: ReportSection;
  allergiesReactions: ReportSection;
  lifestyleContext: ReportSection;
  triggerHypotheses: ReportSection;
  forecastSummaries: ReportSection;
  confidenceNotes: ReportSection;
  providerQuestions: ReportSection;
}

export interface RawProfileBundle {
  userId: string;
  userName: string;
  userEmail: string;
  memberSince: string;
  sections: Record<string, { value: Record<string, unknown>; version: number; updatedAt: string | null }>;
  faceAtlasScans: Array<{
    scanDate: string;
    userLesionCount: number | null;
    modelLesionCount: number | null;
    agreementPct: number | null;
    confidence: string;
    hasRetainedImage: boolean;
  }>;
  treatmentPlans: Array<{
    title: string;
    description: string | null;
    status: string;
    startedAt: string | null;
    endedAt: string | null;
    schedule: unknown;
  }>;
  treatmentCheckins: Array<{
    checkinDate: string;
    status: string;
    irritation: number | null;
    notes: string | null;
  }>;
  triggerHypotheses: Array<{
    triggerName: string;
    status: string;
    evidenceCount: number;
    notes: string | null;
  }>;
  forecastSummaries: Array<{
    window: string;
    status: string;
    summary: string | null;
    confidence: string | null;
  }>;
  dailyLogCount: number;
  daysOfHistory: number;
}
