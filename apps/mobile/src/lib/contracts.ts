/**
 * Shared Contracts
 *
 * Type-safe contracts for all API operations in AcneTrex v3 mobile.
 * These types are the single source of truth for data shapes across
 * the mobile app, ensuring no drift between UI and API layers.
 */

// ─── Auth Contracts ───────────────────────────────────────────────────────────

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignUpRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  userId: string;
  email: string;
  accessToken: string;
}

// ─── Profile Contracts ────────────────────────────────────────────────────────

export interface ProfileUpdateRequest {
  display_name?: string;
  date_of_birth?: string; // ISO date: YYYY-MM-DD
  sex?: "male" | "female" | "non_binary" | "prefer_not_to_say";
  skin_tone?: SkinTone;
  timezone?: string;
  climate_preference?: string;
}

export type SkinTone =
  | "very_fair"
  | "fair"
  | "medium"
  | "olive"
  | "brown"
  | "dark";

// ─── Onboarding Contracts ─────────────────────────────────────────────────────

export interface SkinHistoryInput {
  onset_age?: number;
  duration_years?: number;
  severity?: "mild" | "moderate" | "severe";
  flare_frequency?: "rarely" | "sometimes" | "often" | "always";
  self_assessment?: string;
  notes?: string;
}

export interface GoalsInput {
  primary_goal: string;
  secondary_goals?: string[];
}

// ─── Log Contracts ────────────────────────────────────────────────────────────

export interface SleepLogInput {
  quality: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}

export interface FoodLogInput {
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  description: string;
  notes?: string;
}

export interface StressLogInput {
  stress_level: number; // 1-10
  notes?: string;
}

export interface TreatmentCheckinInput {
  status: "done" | "partial" | "skipped";
  irritation?: number; // 0-10
  notes?: string;
}

// ─── Consent Contracts ────────────────────────────────────────────────────────

export interface ConsentUpdateRequest {
  anonymous_learning?: boolean;
  raw_image_learning?: boolean;
  include_faceatlas_photos_in_reports?: boolean;
  include_treatment_details_in_reports?: boolean;
  marketing_notifications?: boolean;
  product_analysis_notifications?: boolean;
  report_ready_notifications?: boolean;
  streak_risk_notifications?: boolean;
  weather_alert_notifications?: boolean;
}

// ─── API Response Contracts ───────────────────────────────────────────────────

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  code: string;
  message: string;
  details?: unknown;
}

export type ApiResult<T> = ApiSuccess<T> | ApiError;

// ─── Uncertainty Markers ──────────────────────────────────────────────────────
// AcneTrex zero-fabrication contract: all AI outputs must carry confidence

export interface UncertaintyMarker {
  confidence: "high" | "medium" | "low";
  basis: "measured" | "estimated" | "inferred";
  caveat?: string;
}

export interface InsightWithUncertainty<T> {
  data: T;
  uncertainty: UncertaintyMarker;
  dataPointCount: number;
  minDataPointsRequired: number;
  isReliable: boolean;
}
