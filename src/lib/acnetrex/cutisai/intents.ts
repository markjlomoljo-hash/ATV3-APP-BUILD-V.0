// AcneTrex V3 — CutisAI deterministic intent registry.
//
// The deterministic tier never guesses: a message either matches a typed
// intent from this registry (keyword rules, first priority match wins) or it
// is honestly classified as outside_evidence_base. Intents declare the
// evidence sources their replies are allowed to cite so the responder can
// never reach beyond the user's own persisted rows and the curated module
// reference.
import { ACNETREX_MODULES, type AcneTrexModule } from "@/lib/acnetrex/modules/module-registry";

export type CutisAiIntentId =
  | "capability_query"
  | "module_explanation"
  | "memory_recall"
  | "streak_status"
  | "sleep_summary"
  | "food_summary"
  | "trigger_summary"
  | "treatment_adherence"
  | "forecast_status"
  | "scan_summary"
  | "outside_evidence_base";

export type CutisAiEvidenceSource =
  | { kind: "user_records"; table: string }
  | { kind: "curated_content"; contentId: string };

export type CutisAiIntentDefinition = {
  id: Exclude<CutisAiIntentId, "outside_evidence_base" | "module_explanation">;
  description: string;
  evidenceSources: CutisAiEvidenceSource[];
  patterns: RegExp[];
};

export type CutisAiIntentMatch =
  | { intentId: CutisAiIntentDefinition["id"]; definition: CutisAiIntentDefinition }
  | { intentId: "module_explanation"; module: AcneTrexModule }
  | { intentId: "outside_evidence_base" };

/**
 * Ordered registry: earlier entries win ties. Patterns are deliberately
 * conservative — an unmatched message must fall through to the honest
 * refusal instead of being force-fitted into an intent.
 */
export const CUTISAI_INTENTS: CutisAiIntentDefinition[] = [
  {
    id: "capability_query",
    description: "What CutisAI can and cannot answer in this deployment.",
    evidenceSources: [{ kind: "curated_content", contentId: "cutisai" }],
    patterns: [
      /\bwhat can you (?:do|answer|help)\b/i,
      /\bhow do you work\b/i,
      /\bwho are you\b/i,
      /\byour (?:capabilities|limitations)\b/i,
      /\bare you an? (?:ai|llm|language model|chatbot)\b/i,
    ],
  },
  {
    id: "memory_recall",
    description: "Facts the user explicitly stated in past conversations.",
    evidenceSources: [{ kind: "user_records", table: "user_memory_facts" }],
    patterns: [
      /\bwhat do you (?:remember|know) about me\b/i,
      /\bsaved (?:memory )?facts?\b/i,
      /\bmy (?:saved|stored) (?:facts|memory)\b/i,
      /\bwhat have i told you\b/i,
    ],
  },
  {
    id: "streak_status",
    description: "Persisted streak, points, rank, pet, and badge state.",
    evidenceSources: [
      { kind: "user_records", table: "gamification" },
      { kind: "user_records", table: "user_badges" },
    ],
    patterns: [/\bstreaks?\b/i, /\bbadges?\b/i, /\bpoints?\b/i, /\brank\b/i, /\bpet\b/i],
  },
  {
    id: "sleep_summary",
    description: "Saved sleep log records.",
    evidenceSources: [{ kind: "user_records", table: "sleep_logs" }],
    patterns: [/\bsleep\b/i, /\bslept\b/i],
  },
  {
    id: "food_summary",
    description: "Saved food log records.",
    evidenceSources: [{ kind: "user_records", table: "food_logs" }],
    patterns: [/\bfood\b/i, /\bmeals?\b/i, /\bdiet\b/i, /\beat(?:en|ing)?\b/i, /\bsnacks?\b/i],
  },
  {
    id: "trigger_summary",
    description: "Persisted trigger hypotheses with evidence counts.",
    evidenceSources: [{ kind: "user_records", table: "trigger_hypotheses" }],
    patterns: [/\btriggers?\b/i],
  },
  {
    id: "treatment_adherence",
    description: "Saved treatment check-in history.",
    evidenceSources: [{ kind: "user_records", table: "treatment_checkins" }],
    patterns: [/\btreatments?\b/i, /\bcheck-?ins?\b/i, /\badherence\b/i, /\bdoses?\b/i],
  },
  {
    id: "forecast_status",
    description: "Persisted forecast summary records and their honest status.",
    evidenceSources: [{ kind: "user_records", table: "forecast_summaries" }],
    patterns: [/\bforecasts?\b/i, /\boutlook\b/i, /\bnext (?:\d+|few) days\b/i],
  },
  {
    id: "scan_summary",
    description: "Saved FaceAtlas scan records.",
    evidenceSources: [{ kind: "user_records", table: "face_atlas_scans" }],
    patterns: [/\bscans?\b/i, /\bface ?atlas\b/i, /\bphotos?\b/i, /\blesion counts?\b/i],
  },
];

const MODULE_EXPLANATION_VERBS = /\b(?:what is|what's|whats|explain|tell me about|describe|how does)\b/i;

function moduleNameCandidates(module: AcneTrexModule): string[] {
  return [module.name.toLowerCase(), module.id.toLowerCase(), module.id.replace(/-/g, " ").toLowerCase()];
}

/** Deterministic module lookup: exact substring match against curated names. */
export function findModuleMentionedIn(message: string): AcneTrexModule | undefined {
  const normalized = message.toLowerCase();
  return ACNETREX_MODULES.find((module) =>
    moduleNameCandidates(module).some((candidate) => normalized.includes(candidate)),
  );
}

export function matchCutisAiIntent(message: string): CutisAiIntentMatch {
  const trimmed = message.trim();
  if (!trimmed) return { intentId: "outside_evidence_base" };

  const capability = CUTISAI_INTENTS.find((definition) => definition.id === "capability_query");
  if (capability && capability.patterns.some((pattern) => pattern.test(trimmed))) {
    return { intentId: "capability_query", definition: capability };
  }

  // Module explanations outrank data-lookup keywords: "what is SleepDerm"
  // must resolve to the curated module reference, not the sleep log lookup.
  if (MODULE_EXPLANATION_VERBS.test(trimmed)) {
    const mentionedModule = findModuleMentionedIn(trimmed);
    if (mentionedModule) return { intentId: "module_explanation", module: mentionedModule };
  }

  for (const definition of CUTISAI_INTENTS) {
    if (definition.patterns.some((pattern) => pattern.test(trimmed))) {
      return { intentId: definition.id, definition };
    }
  }

  return { intentId: "outside_evidence_base" };
}
