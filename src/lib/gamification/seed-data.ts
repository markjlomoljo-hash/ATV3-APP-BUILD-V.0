// Static catalog data (task templates, badges, ranks). This is configuration,
// not user data — it is safe to seed deterministically. It never fabricates
// a user's personal progress; it only defines the rules used to compute
// progress from real records.

export type TaskTemplateSeed = {
  id: string;
  category: "logging" | "scan" | "treatment" | "consent" | "feedback" | "backfill";
  title: string;
  description: string;
  reasonTemplate: string;
  basePoints: number;
  difficulty: "easy" | "medium" | "hard";
  requiredForStreak: boolean;
};

export const TASK_TEMPLATES: TaskTemplateSeed[] = [
  {
    id: "log_sleep",
    category: "logging",
    title: "Log last night's sleep",
    description: "Record when you slept, woke up, and how it felt.",
    reasonTemplate: "Sleep data improves SleepDerm's circadian and recovery analysis.",
    basePoints: 10,
    difficulty: "easy",
    requiredForStreak: true,
  },
  {
    id: "log_meals",
    category: "logging",
    title: "Log today's meals",
    description: "Log the meals you told us you usually eat.",
    reasonTemplate: "Meal logs let DermDiet and TriggerGraph check for dietary patterns.",
    basePoints: 10,
    difficulty: "easy",
    requiredForStreak: true,
  },
  {
    id: "scan_freshness",
    category: "scan",
    title: "Take a fresh FaceAtlas scan",
    description: "Your last scan is more than 7 days old, or you haven't scanned yet.",
    reasonTemplate: "Fresh scans keep lesion trends and AI confidence up to date.",
    basePoints: 25,
    difficulty: "medium",
    requiredForStreak: false,
  },
  {
    id: "annotate_scan",
    category: "scan",
    title: "Finish your lesion annotation",
    description: "Your last scan is missing the mandatory lesion annotation.",
    reasonTemplate: "Annotation lets FaceAtlas compare your count with the model's count.",
    basePoints: 15,
    difficulty: "medium",
    requiredForStreak: false,
  },
  {
    id: "treatment_checkin",
    category: "treatment",
    title: "Complete today's treatment check-in",
    description: "Log use, skip, or irritation for a scheduled treatment.",
    reasonTemplate: "Check-ins power adherence tracking and safety monitoring.",
    basePoints: 15,
    difficulty: "easy",
    requiredForStreak: true,
  },
  {
    id: "treatment_provider_review",
    category: "treatment",
    title: "Provider check-in due",
    description: "This plan's review date has arrived — confirm with your provider before continuing or escalating.",
    reasonTemplate: "Prescription-related changes always require provider confirmation.",
    basePoints: 25,
    difficulty: "medium",
    requiredForStreak: false,
  },
  {
    id: "consent_review",
    category: "consent",
    title: "Review your privacy & consent settings",
    description: "Confirm your data sharing and learning preferences are still accurate.",
    reasonTemplate: "Keeping consent current keeps your data use honest and revocable.",
    basePoints: 10,
    difficulty: "easy",
    requiredForStreak: false,
  },
  {
    id: "backfill_log",
    category: "backfill",
    title: "Backfill yesterday's missing log",
    description: "You missed a log yesterday. Add it now if you remember it accurately.",
    reasonTemplate: "Honest backfill is better than a silent gap in your history.",
    basePoints: 5,
    difficulty: "easy",
    requiredForStreak: false,
  },
];

export type BadgeSeed = {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
};

export const BADGES: BadgeSeed[] = [
  { id: "first_scan", name: "First Look", description: "Completed your first FaceAtlas scan.", category: "scan", icon: "🔬" },
  { id: "seven_day_streak", name: "Consistency Starter", description: "Reached a 7-day full streak.", category: "streak", icon: "🔥" },
  { id: "thirty_day_streak", name: "Data Steward", description: "Reached a 30-day full streak.", category: "streak", icon: "🛡️" },
  { id: "treatment_adherent", name: "Adherence Ally", description: "Logged 14 treatment check-ins for one plan.", category: "treatment", icon: "💊" },
  { id: "annotation_pro", name: "Annotation Pro", description: "Completed lesion annotation on 5 scans.", category: "scan", icon: "🖊️" },
  { id: "consent_aware", name: "Privacy Aware", description: "Completed a consent & privacy review.", category: "privacy", icon: "🔒" },
  { id: "comeback", name: "Recovery Signal", description: "Backfilled a missed log honestly.", category: "recovery", icon: "🌱" },
];

export type RankSeed = {
  id: string;
  name: string;
  minPoints: number;
  minStreak: number;
  sortOrder: number;
};

export const RANKS: RankSeed[] = [
  { id: "signal_seeker", name: "Signal Seeker", minPoints: 0, minStreak: 0, sortOrder: 0 },
  { id: "pattern_apprentice", name: "Pattern Apprentice", minPoints: 200, minStreak: 3, sortOrder: 1 },
  { id: "trend_tracker", name: "Trend Tracker", minPoints: 600, minStreak: 7, sortOrder: 2 },
  { id: "insight_builder", name: "Insight Builder", minPoints: 1500, minStreak: 14, sortOrder: 3 },
  { id: "cutis_analyst", name: "Cutis Analyst", minPoints: 3000, minStreak: 21, sortOrder: 4 },
  { id: "atlas_expert", name: "Atlas Expert", minPoints: 6000, minStreak: 30, sortOrder: 5 },
];

export const PET_STAGES = [
  { code: "seed_signal", name: "Seed Signal", minGrowth: 0 },
  { code: "calibration_sprout", name: "Calibration Sprout", minGrowth: 50 },
  { code: "data_bloom", name: "Data Bloom", minGrowth: 150 },
  { code: "pattern_sentinel", name: "Pattern Sentinel", minGrowth: 350 },
  { code: "cutis_guardian", name: "Cutis Guardian", minGrowth: 700 },
  { code: "atlas_prime", name: "Atlas Prime", minGrowth: 1200 },
] as const;
