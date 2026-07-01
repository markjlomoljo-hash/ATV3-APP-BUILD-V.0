import { randomUUID } from "crypto";
import { db } from "@/db";
import { treatmentSafetyFlags } from "@/db/schema";
import { classifyIngredient } from "./ingredient-rules";

export const SEVERE_BARRIER_SYMPTOMS = ["blistering", "swelling", "severe_burning", "open_sores"];
export const SEVERE_SIDE_EFFECTS = ["allergic_reaction", "difficulty_breathing", "severe_rash", "facial_swelling"];

export type CheckinSafetyInput = {
  irritationLevel: "none" | "mild" | "moderate" | "severe";
  barrierSymptoms: string[];
  sideEffects: string[];
};

export function isSevereCheckin(input: CheckinSafetyInput): { severe: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (input.irritationLevel === "severe") reasons.push("Severe irritation reported.");
  const severeBarrier = input.barrierSymptoms.filter((s) => SEVERE_BARRIER_SYMPTOMS.includes(s));
  if (severeBarrier.length) reasons.push(`Severe barrier symptom(s): ${severeBarrier.join(", ")}.`);
  const severeSideEffects = input.sideEffects.filter((s) => SEVERE_SIDE_EFFECTS.includes(s));
  if (severeSideEffects.length) reasons.push(`Possible severe reaction: ${severeSideEffects.join(", ")}.`);
  return { severe: reasons.length > 0, reasons };
}

export const PROVIDER_CONTACT_GUIDANCE =
  "This looks like it may need a provider's attention. Please stop escalating this treatment and contact your dermatologist or prescriber before changing anything. AcneTrex cannot diagnose or adjust medication.";

export async function raiseSafetyFlag(params: {
  planId: string;
  userId: string;
  flagType: string;
  severity: "info" | "warning" | "severe";
  message: string;
  requiresProviderContact?: boolean;
}) {
  const [flag] = await db
    .insert(treatmentSafetyFlags)
    .values({
      id: randomUUID(),
      planId: params.planId,
      userId: params.userId,
      flagType: params.flagType,
      severity: params.severity,
      message: params.message,
      requiresProviderContact: params.requiresProviderContact ?? false,
    })
    .returning();
  return flag;
}

/** Plan-creation-time safety gates. Throws are handled by callers as
 * validation errors (422), not silent downgrades. */
export function evaluatePlanCreationSafety(input: { activeIngredient: string; sourceType: string; prescriptionStatus: string }) {
  const category = classifyIngredient(input.activeIngredient);
  const notes: string[] = [];

  if (input.prescriptionStatus === "prescription" && input.sourceType !== "provider_prescribed") {
    throw new Error("SAFETY_GATE:Prescription treatments must be marked as provider-prescribed.");
  }

  if (category === "isotretinoin") {
    notes.push(
      "Isotretinoin support is limited to education, adherence reminders, symptom logging, and lab/appointment reminders you enter yourself. AcneTrex never adjusts isotretinoin dosing.",
    );
  }

  if (category === "antibiotic_oral" || category === "antibiotic_topical") {
    notes.push(
      "Antibiotic stewardship reminder: use exactly as prescribed, do not extend duration on your own, and contact your provider before continuing beyond the prescribed course.",
    );
  }

  return { category, notes };
}
