// AcneTrex V3 — CutisAI deterministic evidence-grounded responder.
//
// This is the honest tier that runs when no LLM provider is configured.
// Replies are assembled from fixed templates whose only variable content is
// (a) column values read from the user's own persisted rows and (b) curated
// module reference copy from the module registry. Every reply carries its
// evidence refs and an explicit capability statement; anything the evidence
// base cannot answer gets the outside_evidence_base refusal. No value is
// ever estimated, predicted, or invented here.
import type { AcneTrexModule } from "@/lib/acnetrex/modules/module-registry";
import { matchCutisAiIntent } from "./intents";
import {
  curatedContentRef,
  retrieveFoodLogEvidence,
  retrieveForecastEvidence,
  retrieveGamificationEvidence,
  retrieveMemoryFactEvidence,
  retrieveScanEvidence,
  retrieveSleepLogEvidence,
  retrieveTreatmentCheckinEvidence,
  retrieveTriggerEvidence,
  type CutisAiEvidenceRef,
} from "./evidence";
import type {
  CutisAiGenerationInput,
  CutisAiGenerationResult,
  CutisAiReply,
  CutisAiResponseProvider,
} from "./provider";

export const CUTISAI_DETERMINISTIC_MODEL_NAME = "cutisai-deterministic-responder";
export const CUTISAI_DETERMINISTIC_MODEL_VERSION = "1.0.0";
export const CUTISAI_DETERMINISTIC_RUNTIME_MODE = "deterministic_local";

export const CUTISAI_CAPABILITY_STATEMENT =
  "CutisAI deterministic tier: this reply was assembled only from your saved records and this app's curated module reference. " +
  "No generative model produced it. CutisAI does not provide medical diagnosis or treatment instructions — " +
  "please consult a qualified clinician for medical decisions.";

export const CUTISAI_REFUSAL_MESSAGE =
  "That question is outside my evidence base. In this deployment I can only answer from your saved records " +
  "(sleep, food, treatment check-ins, triggers, forecasts, scans, streaks, and facts you explicitly told me) " +
  "and the curated module reference. Try asking about one of those, or ask \"what can you do\".";

function withCapabilityStatement(body: string): string {
  return `${body}\n\n${CUTISAI_CAPABILITY_STATEMENT}`;
}

function reply(
  partial: Pick<CutisAiReply, "intentId" | "evidenceStatus" | "evidenceRefs"> & {
    body: string;
    retrievedMemoryFactIds?: string[];
  },
): CutisAiReply {
  return {
    intentId: partial.intentId,
    content: withCapabilityStatement(partial.body),
    evidenceRefs: partial.evidenceRefs,
    evidenceStatus: partial.evidenceStatus,
    retrievedMemoryFactIds: partial.retrievedMemoryFactIds ?? [],
    runtimeMode: CUTISAI_DETERMINISTIC_RUNTIME_MODE,
    modelName: CUTISAI_DETERMINISTIC_MODEL_NAME,
    modelVersion: CUTISAI_DETERMINISTIC_MODEL_VERSION,
  };
}

function insufficientData(intentId: CutisAiReply["intentId"], body: string): CutisAiReply {
  return reply({ intentId, evidenceStatus: "insufficient_data", evidenceRefs: [], body });
}

function moduleExplanationReply(module: AcneTrexModule): CutisAiReply {
  const consent =
    module.requiresConsentScopes.length > 0
      ? `It requires the consent scope(s): ${module.requiresConsentScopes.join(", ")}.`
      : "It requires no additional consent scopes.";
  const body =
    `${module.name} (${module.category}, route ${module.route}): ${module.description} ` +
    `${consent} Its data lives in: ${module.dataTables.join(", ") || "no dedicated tables"}. ` +
    `Current honest status — service: ${module.serviceStatus}, readiness: ${module.readinessStatus}. ` +
    `Next planned step: ${module.nextAction}`;
  return reply({
    intentId: "module_explanation",
    evidenceStatus: "curated_content",
    evidenceRefs: [curatedContentRef(module.id, `curated module reference: ${module.name}`)],
    body,
  });
}

function capabilityReply(): CutisAiReply {
  const body =
    "I am the CutisAI deterministic assistant. I can report: your streak/badge/points state, saved sleep and food logs, " +
    "treatment check-in history, trigger hypotheses, forecast record status, FaceAtlas scan records, facts you explicitly " +
    "stated in conversation, and curated explanations of any AcneTrex module. I cannot speculate, and questions outside " +
    "those sources get an honest refusal. A generative model tier can be enabled later behind the same contract, but none " +
    "is configured in this deployment.";
  return reply({
    intentId: "capability_query",
    evidenceStatus: "curated_content",
    evidenceRefs: [curatedContentRef("cutisai", "curated module reference: CutisAI")],
    body,
  });
}

async function generateDeterministicReply(input: CutisAiGenerationInput): Promise<CutisAiReply> {
  const match = matchCutisAiIntent(input.message);

  if (match.intentId === "outside_evidence_base") {
    return reply({
      intentId: "outside_evidence_base",
      evidenceStatus: "outside_evidence_base",
      evidenceRefs: [],
      body: CUTISAI_REFUSAL_MESSAGE,
    });
  }

  if (match.intentId === "capability_query") return capabilityReply();
  if (match.intentId === "module_explanation") return moduleExplanationReply(match.module);

  const { client, userId } = input;

  switch (match.intentId) {
    case "streak_status": {
      const evidence = await retrieveGamificationEvidence(client, userId);
      if (!evidence.state && evidence.badges.length === 0) {
        return insufficientData(
          "streak_status",
          "You have no saved streak or badge state yet. Streaks and badges are derived only from completed durable tasks and adherent treatment check-ins, so this state appears once those records exist.",
        );
      }
      const state = evidence.state;
      const badgeList =
        evidence.badges.length > 0
          ? `Earned badges: ${evidence.badges.map((badge) => badge.code).join(", ")}.`
          : "No badges recorded yet.";
      const stateLine = state
        ? `Your saved progress state: current streak ${state.currentStreak} day(s), longest streak ${state.longestStreak} day(s), ${state.points} point(s), rank ${state.rank ?? "not yet assigned"}, pet stage ${state.petStage} (XP ${state.petXp}).`
        : "No aggregate progress row is saved yet.";
      return reply({
        intentId: "streak_status",
        evidenceStatus: "grounded",
        evidenceRefs: evidence.refs,
        body: `${stateLine} ${badgeList} All of this is derived from your persisted task completions and check-ins — nothing is estimated.`,
      });
    }
    case "sleep_summary": {
      const evidence = await retrieveSleepLogEvidence(client, userId);
      if (evidence.totalCount === 0) {
        return insufficientData(
          "sleep_summary",
          "You have no saved sleep logs yet, so I cannot report anything about your sleep. Once you save sleep logs I can list them here.",
        );
      }
      const lines = evidence.recent.map((row) => {
        const quality = row.quality === null ? "no quality rating" : `quality ${row.quality}`;
        const times =
          row.sleepTime && row.wakeTime ? `, ${row.sleepTime} to ${row.wakeTime}` : "";
        return `${row.logDate} (${quality}${times})`;
      });
      return reply({
        intentId: "sleep_summary",
        evidenceStatus: "grounded",
        evidenceRefs: evidence.refs,
        body: `You have ${evidence.totalCount} saved sleep log(s). Most recent: ${lines.join("; ")}. These are your recorded values only — I do not infer sleep quality beyond what you logged.`,
      });
    }
    case "food_summary": {
      const evidence = await retrieveFoodLogEvidence(client, userId);
      if (evidence.totalCount === 0) {
        return insufficientData(
          "food_summary",
          "You have no saved food logs yet, so I cannot report anything about your meals. Once you save food logs I can list them here.",
        );
      }
      const lines = evidence.recent.map(
        (row) => `${row.logDate} ${row.mealType}${row.isBaseline ? " (baseline)" : ""}${row.completed ? "" : " (incomplete)"}`,
      );
      return reply({
        intentId: "food_summary",
        evidenceStatus: "grounded",
        evidenceRefs: evidence.refs,
        body: `You have ${evidence.totalCount} saved food log(s). Most recent: ${lines.join("; ")}. Food tracking here is non-judgmental exposure logging, not dietary advice.`,
      });
    }
    case "trigger_summary": {
      const evidence = await retrieveTriggerEvidence(client, userId);
      if (evidence.hypotheses.length === 0) {
        return insufficientData(
          "trigger_summary",
          "No trigger hypotheses are saved for you yet. Hypotheses are built from your logged exposures and outcomes over time; none exist until enough real records accumulate.",
        );
      }
      const lines = evidence.hypotheses.map(
        (row) => `${row.triggerName} (status: ${row.status}, evidence records: ${row.evidenceCount})`,
      );
      return reply({
        intentId: "trigger_summary",
        evidenceStatus: "grounded",
        evidenceRefs: evidence.refs,
        body: `Your saved trigger hypotheses: ${lines.join("; ")}. These are correlations observed in your own records, not causes — a hypothesis is never proof that an exposure caused a change.`,
      });
    }
    case "treatment_adherence": {
      const evidence = await retrieveTreatmentCheckinEvidence(client, userId);
      if (evidence.totalCount === 0) {
        return insufficientData(
          "treatment_adherence",
          "You have no saved treatment check-ins yet, so I cannot report adherence history. Check-ins appear here once you record them.",
        );
      }
      const statusSummary = Object.entries(evidence.statusCounts)
        .map(([status, count]) => `${status}: ${count}`)
        .join(", ");
      return reply({
        intentId: "treatment_adherence",
        evidenceStatus: "grounded",
        evidenceRefs: evidence.refs,
        body: `You have ${evidence.totalCount} saved treatment check-in(s). Across your ${evidence.recent.length} most recent: ${statusSummary}. These counts come directly from your recorded check-ins.`,
      });
    }
    case "forecast_status": {
      const evidence = await retrieveForecastEvidence(client, userId);
      if (evidence.summaries.length === 0) {
        return insufficientData(
          "forecast_status",
          "No forecast records exist for you yet. Forecasts are only generated from sufficient real logging history, and none has been generated — I will not invent one.",
        );
      }
      const lines = evidence.summaries.map(
        (row) => `${row.window} window — status ${row.status}${row.summary ? `: ${row.summary}` : ""}`,
      );
      return reply({
        intentId: "forecast_status",
        evidenceStatus: "grounded",
        evidenceRefs: evidence.refs,
        body: `Your saved forecast records: ${lines.join("; ")}. I report stored forecast records only — I never produce new predictions myself.`,
      });
    }
    case "scan_summary": {
      const evidence = await retrieveScanEvidence(client, userId);
      if (evidence.totalCount === 0) {
        return insufficientData(
          "scan_summary",
          "You have no saved FaceAtlas scans yet, so there is no scan history to report.",
        );
      }
      const lines = evidence.recent.map((row) => {
        const user = row.userLesionCount === null ? "no user count" : `your count ${row.userLesionCount}`;
        const model = row.modelLesionCount === null ? "no model analysis recorded" : `model count ${row.modelLesionCount}`;
        return `${row.scanDate} (${user}, ${model}, confidence: ${row.confidence})`;
      });
      return reply({
        intentId: "scan_summary",
        evidenceStatus: "grounded",
        evidenceRefs: evidence.refs,
        body: `You have ${evidence.totalCount} saved scan record(s). Most recent: ${lines.join("; ")}. Counts shown are exactly what was recorded — missing model analyses are reported as missing.`,
      });
    }
    case "memory_recall": {
      const evidence = await retrieveMemoryFactEvidence(client, userId);
      if (evidence.facts.length === 0) {
        return insufficientData(
          "memory_recall",
          "I have no saved memory facts about you. I only save facts you explicitly state in conversation (for example \"my skin type is oily\"), and none are stored yet.",
        );
      }
      const lines = evidence.facts.map((row) => `${row.factKey}: ${JSON.stringify(row.factValue)}`);
      return reply({
        intentId: "memory_recall",
        evidenceStatus: "grounded",
        evidenceRefs: evidence.refs,
        retrievedMemoryFactIds: evidence.facts.map((row) => row.id),
        body: `Facts you explicitly told me (and can delete at any time): ${lines.join("; ")}. Nothing here was inferred — each fact was stated by you.`,
      });
    }
  }
}

export const deterministicCutisAiProvider: CutisAiResponseProvider = {
  id: "deterministic",
  runtimeMode: CUTISAI_DETERMINISTIC_RUNTIME_MODE,
  async generate(input: CutisAiGenerationInput): Promise<CutisAiGenerationResult> {
    const generated = await generateDeterministicReply(input);
    return { status: "generated", reply: generated };
  },
};

export type { CutisAiReply, CutisAiEvidenceRef };
