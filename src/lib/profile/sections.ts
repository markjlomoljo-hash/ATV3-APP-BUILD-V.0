import { PROFILE_SECTION_KEYS, ProfileSectionKey, VERSIONED_SECTION_KEYS } from "@/types/profile";

export interface SectionMetadata {
  key: ProfileSectionKey;
  label: string;
  description: string;
  isVersioned: boolean;
  emptyValue: Record<string, unknown>;
}

export const SECTION_METADATA: Record<ProfileSectionKey, SectionMetadata> = {
  identity: {
    key: "identity",
    label: "Identity & Account",
    description: "Display name, pronouns, and account-level context.",
    isVersioned: false,
    emptyValue: {},
  },
  skin_profile: {
    key: "skin_profile",
    label: "Baseline Skin Profile",
    description: "Skin type, tone, sensitivity baseline, and known conditions.",
    isVersioned: false,
    emptyValue: { skinType: null, undertone: null, knownConditions: [] },
  },
  goals: {
    key: "goals",
    label: "Goals",
    description: "The outcomes the user wants AcneTrex to prioritize.",
    isVersioned: true,
    emptyValue: { goals: [] },
  },
  acne_history: {
    key: "acne_history",
    label: "Acne History & Onset Timeline",
    description: "When acne began, prior severity, and long-term pattern.",
    isVersioned: true,
    emptyValue: { onsetAge: null, priorSeverity: null, patternNotes: null },
  },
  severity_tendency: {
    key: "severity_tendency",
    label: "Current Severity & Lesion Tendency",
    description: "Predominant lesion types and zones of concern.",
    isVersioned: true,
    emptyValue: { predominantLesionTypes: [], zonesOfConcern: [] },
  },
  barrier_sensitivity: {
    key: "barrier_sensitivity",
    label: "Barrier & Sensitivity Profile",
    description: "Barrier symptoms, tolerance thresholds, and known flare patterns.",
    isVersioned: true,
    emptyValue: { barrierSymptoms: [], toleranceNotes: null },
  },
  routine_inventory: {
    key: "routine_inventory",
    label: "Routine & Product Inventory",
    description: "Current AM/PM routine and active product list.",
    isVersioned: true,
    emptyValue: { amRoutine: [], pmRoutine: [] },
  },
  medication_treatment_history: {
    key: "medication_treatment_history",
    label: "Medication & Treatment History",
    description: "Past and current prescription/OTC treatments.",
    isVersioned: true,
    emptyValue: { history: [] },
  },
  allergies_reactions: {
    key: "allergies_reactions",
    label: "Allergies & Adverse Reactions",
    description: "Known allergies, intolerances, and adverse skin reactions.",
    isVersioned: true,
    emptyValue: { allergies: [], reactions: [] },
  },
  lifestyle_baseline: {
    key: "lifestyle_baseline",
    label: "Lifestyle Baseline",
    description: "Sleep, stress, diet, activity, and cycle context provided voluntarily.",
    isVersioned: true,
    emptyValue: {},
  },
  trigger_hypotheses_notes: {
    key: "trigger_hypotheses_notes",
    label: "Trigger Hypotheses (User Notes)",
    description: "User-entered suspicions to validate against real logs.",
    isVersioned: true,
    emptyValue: { userNotedSuspects: [] },
  },
  notification_preferences: {
    key: "notification_preferences",
    label: "Notification Preferences",
    description: "Which real-event notifications you want to receive.",
    isVersioned: false,
    emptyValue: {},
  },
};

export function isVersionedSection(key: ProfileSectionKey): boolean {
  return VERSIONED_SECTION_KEYS.includes(key);
}

export function allSectionKeys(): ProfileSectionKey[] {
  return [...PROFILE_SECTION_KEYS];
}
