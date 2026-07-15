import { create } from "zustand";

export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  date_of_birth: string | null;
  sex: string | null;
  skin_tone: string | null;
  timezone: string | null;
  climate_preference: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

// Matches actual consent_settings table schema
export interface ConsentSettings {
  id: string;
  user_id: string;
  anonymous_learning: boolean;
  raw_image_learning: boolean;
  include_faceatlas_photos_in_reports: boolean;
  include_treatment_details_in_reports: boolean;
  marketing_notifications: boolean;
  product_analysis_notifications: boolean;
  report_ready_notifications: boolean;
  streak_risk_notifications: boolean;
  weather_alert_notifications: boolean;
  updated_at: string;
}

interface ProfileState {
  profile: Profile | null;
  consents: ConsentSettings | null;
  loading: boolean;
  error: string | null;
  setProfile: (profile: Profile | null) => void;
  setConsents: (consents: ConsentSettings | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  consents: null,
  loading: false,
  error: null,
  setProfile: (profile) => set({ profile }),
  setConsents: (consents) => set({ consents }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () =>
    set({ profile: null, consents: null, loading: false, error: null }),
}));
