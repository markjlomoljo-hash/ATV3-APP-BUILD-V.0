import "server-only";

import { z } from "zod";
import { getPool } from "@/db";
import { executeIdempotent } from "@/lib/reliability/idempotency";

export const canonicalConsentPatchSchema = z.object({
  personalProcessing: z.boolean().optional(),
  rawImageProcessing: z.boolean().optional(),
  personalLearning: z.boolean().optional(),
  rawImageRetention: z.boolean().optional(),
  anonymousLearning: z.boolean().optional(),
  researchShare: z.boolean().optional(),
  marketing: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "At least one consent field must be provided",
});

export type CanonicalConsentPatch = z.infer<typeof canonicalConsentPatchSchema>;

type ConsentRow = {
  id: string;
  personalProcessing: boolean;
  rawImageProcessing: boolean;
  personalLearning: boolean;
  rawImageRetention: boolean;
  anonymousLearning: boolean;
  researchShare: boolean;
  marketing: boolean;
  consentedAt: Date | null;
  updatedAt: Date;
};

export const canonicalConsentSchema = z.object({
  personalProcessing: z.boolean(),
  rawImageProcessing: z.boolean(),
  personalLearning: z.boolean(),
  rawImageRetention: z.boolean(),
  anonymousLearning: z.boolean(),
  researchShare: z.boolean(),
  marketing: z.boolean(),
  consentedAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime().nullable(),
}).strict();

export type CanonicalConsent = z.infer<typeof canonicalConsentSchema>;

const emptyConsent: CanonicalConsent = {
  personalProcessing: false,
  rawImageProcessing: false,
  personalLearning: false,
  rawImageRetention: false,
  anonymousLearning: false,
  researchShare: false,
  marketing: false,
  consentedAt: null,
  updatedAt: null,
};

function mapConsent(row: ConsentRow | undefined): CanonicalConsent {
  if (!row) return emptyConsent;
  return {
    personalProcessing: row.personalProcessing,
    rawImageProcessing: row.rawImageProcessing,
    personalLearning: row.personalLearning,
    rawImageRetention: row.rawImageRetention,
    anonymousLearning: row.anonymousLearning,
    researchShare: row.researchShare,
    marketing: row.marketing,
    consentedAt: row.consentedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

const consentSelect = `select id, personal_processing as "personalProcessing",
  raw_image_processing as "rawImageProcessing", personal_learning as "personalLearning",
  raw_image_retention as "rawImageRetention", anonymous_learning as "anonymousLearning",
  research_share as "researchShare", marketing, consented_at as "consentedAt",
  updated_at as "updatedAt" from public.consents`;

export async function getCanonicalConsent(actorId: string): Promise<CanonicalConsent> {
  const result = await getPool().query<ConsentRow>(
    `${consentSelect} where user_id=$1::uuid limit 1`,
    [actorId],
  );
  return mapConsent(result.rows[0]);
}

export async function updateCanonicalConsent(options: {
  actorId: string;
  idempotencyKey: string;
  patch: CanonicalConsentPatch;
}): Promise<{ consent: CanonicalConsent; replayed: boolean }> {
  const patch = canonicalConsentPatchSchema.parse(options.patch);
  const result = await executeIdempotent({
    actorId: options.actorId,
    scope: "canonical-consent",
    key: options.idempotencyKey,
    method: "PATCH",
    route: "/api/consents",
    payload: patch,
    execute: async (client) => {
      // Serialize all consent mutations for this actor, including the first insert.
      // A row lock alone cannot protect the no-row-yet case from lost partial updates.
      await client.query(
        "select pg_advisory_xact_lock(hashtextextended($1::text, 0))",
        [options.actorId],
      );
      const beforeResult = await client.query<ConsentRow>(
        `${consentSelect} where user_id=$1::uuid for update`,
        [options.actorId],
      );
      const before = mapConsent(beforeResult.rows[0]);
      const next = {
        personalProcessing: patch.personalProcessing ?? before.personalProcessing,
        rawImageProcessing: patch.rawImageProcessing ?? before.rawImageProcessing,
        personalLearning: patch.personalLearning ?? before.personalLearning,
        rawImageRetention: patch.rawImageRetention ?? before.rawImageRetention,
        anonymousLearning: patch.anonymousLearning ?? before.anonymousLearning,
        researchShare: patch.researchShare ?? before.researchShare,
        marketing: patch.marketing ?? before.marketing,
      };
      const hasAffirmativeConsent = Object.values(next).some(Boolean);
      const updated = await client.query<ConsentRow>(
        `insert into public.consents
         (user_id, personal_processing, raw_image_processing, personal_learning,
          raw_image_retention, anonymous_learning, research_share, marketing,
          consented_at, updated_at)
         values ($1::uuid,$2,$3,$4,$5,$6,$7,$8,
                 case when $9 then coalesce($10::timestamptz,now()) else $10::timestamptz end,
                 now())
         on conflict (user_id) do update set
           personal_processing=excluded.personal_processing,
           raw_image_processing=excluded.raw_image_processing,
           personal_learning=excluded.personal_learning,
           raw_image_retention=excluded.raw_image_retention,
           anonymous_learning=excluded.anonymous_learning,
           research_share=excluded.research_share,
           marketing=excluded.marketing,
           consented_at=excluded.consented_at,
           updated_at=now()
         returning id, personal_processing as "personalProcessing",
           raw_image_processing as "rawImageProcessing", personal_learning as "personalLearning",
           raw_image_retention as "rawImageRetention", anonymous_learning as "anonymousLearning",
           research_share as "researchShare", marketing, consented_at as "consentedAt",
           updated_at as "updatedAt"`,
        [
          options.actorId,
          next.personalProcessing,
          next.rawImageProcessing,
          next.personalLearning,
          next.rawImageRetention,
          next.anonymousLearning,
          next.researchShare,
          next.marketing,
          hasAffirmativeConsent,
          before.consentedAt,
        ],
      );
      const row = updated.rows[0];
      if (!row) throw new Error("consent_update_missing");
      const consent = mapConsent(row);
      await client.query(
        `insert into public.audit_logs
         (user_id, actor_type, action, target_table, target_id, metadata)
         values ($1::uuid,'user','consent_updated','consents',$2::uuid,$3::jsonb)`,
        [
          options.actorId,
          row.id,
          JSON.stringify({
            changedFields: Object.keys(patch).sort(),
            before: Object.fromEntries(Object.keys(patch).map((key) => [key, before[key as keyof CanonicalConsent]])),
            after: Object.fromEntries(Object.keys(patch).map((key) => [key, consent[key as keyof CanonicalConsent]])),
          }),
        ],
      );
      return {
        status: 200,
        reference: { consent },
        resourceType: "consent",
        resourceId: row.id,
      };
    },
  });
  return {
    consent: canonicalConsentSchema.parse(result.reference.consent),
    replayed: result.replayed,
  };
}
