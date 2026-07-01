export function TreatmentProviderReviewPrompt({ reviewDate, prescriptionStatus }: { reviewDate: string | null; prescriptionStatus: string }) {
  if (!reviewDate) return null;
  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-800">
      <p className="font-semibold">Provider review date: {reviewDate}</p>
      <p>
        {prescriptionStatus === "prescription"
          ? "AcneTrex cannot change a prescription plan on its own. Confirm any escalation, dose, or frequency changes with your prescriber first."
          : "Use this date to reassess tolerance and progress with a provider if you have one, or on your own if this is a self-selected routine."}
      </p>
    </div>
  );
}
