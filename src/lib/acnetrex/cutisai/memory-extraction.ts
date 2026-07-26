// AcneTrex V3 — CutisAI explicit memory-fact extraction.
//
// Only facts the user explicitly stated in first person are ever extracted;
// nothing is inferred, summarized, or guessed. Each pattern below requires a
// literal self-statement, and unmatched messages produce no memory writes.
// Extracted facts are persisted as user_memory_events (immutable provenance,
// source_record_id = the cutisai_messages row) plus an upsert into the
// current user_memory_facts row keyed by fact_key.
import type { PoolClient } from "pg";

export type CutisAiMemoryFactKey =
  | "stated_skin_type"
  | "stated_allergy"
  | "stated_sleep_goal_hours"
  | "stated_trigger_suspicion";

export type ExtractedMemoryFact = {
  factKey: CutisAiMemoryFactKey;
  value: string;
  /** The exact user text the fact was extracted from. */
  statement: string;
};

type ExtractionRule = {
  factKey: CutisAiMemoryFactKey;
  pattern: RegExp;
  normalize?: (captured: string) => string | null;
};

function cleanFragment(captured: string): string | null {
  const value = captured.trim().replace(/[.!?,;:]+$/, "").trim();
  if (value.length < 2 || value.length > 80) return null;
  return value.toLowerCase();
}

const EXTRACTION_RULES: ExtractionRule[] = [
  {
    factKey: "stated_skin_type",
    pattern: /\bmy skin(?: type)? is (dry|oily|combination|sensitive|normal)\b/i,
    normalize: (captured) => captured.toLowerCase(),
  },
  {
    factKey: "stated_allergy",
    pattern: /\bi(?:'m| am) allergic to ([a-z][a-z0-9 '-]{1,79})/i,
    normalize: cleanFragment,
  },
  {
    factKey: "stated_sleep_goal_hours",
    pattern: /\bmy sleep goal is (\d{1,2}(?:\.\d)?) ?hours?\b/i,
    normalize: (captured) => {
      const hours = Number(captured);
      return Number.isFinite(hours) && hours > 0 && hours <= 24 ? String(hours) : null;
    },
  },
  {
    factKey: "stated_trigger_suspicion",
    pattern: /\bi think (?:my )?([a-z][a-z0-9 '-]{1,79}?) triggers my (?:skin|acne|breakouts)\b/i,
    normalize: cleanFragment,
  },
];

/**
 * Deterministic extraction of explicitly stated facts. Returns at most one
 * fact per fact_key per message and never anything for non-matching text.
 */
export function extractExplicitMemoryFacts(message: string): ExtractedMemoryFact[] {
  const facts: ExtractedMemoryFact[] = [];
  for (const rule of EXTRACTION_RULES) {
    const match = rule.pattern.exec(message);
    if (!match) continue;
    const captured = match[1];
    if (typeof captured !== "string") continue;
    const value = rule.normalize ? rule.normalize(captured) : captured;
    if (value === null || value === undefined || value === "") continue;
    facts.push({ factKey: rule.factKey, value, statement: match[0] });
  }
  return facts;
}

export type PersistedMemoryFact = ExtractedMemoryFact & { eventId: string; factId: string };

/**
 * Persists explicitly stated facts inside the caller's transaction.
 * user_memory_events keeps append-only provenance; user_memory_facts holds
 * the current value per fact_key (unique on (user_id, fact_key) where
 * deleted_at is null) with source_event_ids accumulated, never rewritten.
 */
export async function persistExtractedMemoryFacts(
  client: PoolClient,
  options: { userId: string; sourceMessageId: string; facts: ExtractedMemoryFact[] },
): Promise<PersistedMemoryFact[]> {
  const persisted: PersistedMemoryFact[] = [];
  for (const fact of options.facts) {
    const eventResult = await client.query<{ id: string }>(
      `insert into public.user_memory_events
         (user_id, source_type, source_record_id, memory_type, content, structured_data, consent_scope)
       values ($1::uuid, 'cutisai_message', $2::uuid, 'explicit_user_statement', $3, $4::jsonb, 'personal_memory')
       returning id`,
      [
        options.userId,
        options.sourceMessageId,
        fact.statement,
        JSON.stringify({ factKey: fact.factKey, value: fact.value }),
      ],
    );
    const eventId = eventResult.rows[0]?.id;
    if (!eventId) throw new Error("memory_event_insert_missing");

    const factResult = await client.query<{ id: string }>(
      `insert into public.user_memory_facts
         (user_id, fact_key, fact_value, source_event_ids, consent_scope)
       values ($1::uuid, $2, $3::jsonb, array[$4::uuid], 'personal_memory')
       on conflict (user_id, fact_key) where deleted_at is null
       do update set
         fact_value = excluded.fact_value,
         source_event_ids = array(
           select distinct unnest(public.user_memory_facts.source_event_ids || excluded.source_event_ids)
         ),
         updated_at = now()
       returning id`,
      [options.userId, fact.factKey, JSON.stringify(fact.value), eventId],
    );
    const factId = factResult.rows[0]?.id;
    if (!factId) throw new Error("memory_fact_upsert_missing");

    persisted.push({ ...fact, eventId, factId });
  }
  return persisted;
}
