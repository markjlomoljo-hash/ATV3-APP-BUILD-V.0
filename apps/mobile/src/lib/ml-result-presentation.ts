export type MlPresentationRow = Readonly<{ label: string; value: string }>;

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function presentSleepDermOutput(value: unknown): MlPresentationRow[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return [];
  const output = value as Record<string, unknown>;
  const rows: MlPresentationRow[] = [];
  if (typeof output.state === "string" && ["ready", "partial", "insufficient_data"].includes(output.state)) {
    rows.push({ label: "Analysis state", value: output.state });
  }
  const sampleCount = finiteNumber(output.sample_count);
  if (sampleCount !== null && Number.isInteger(sampleCount) && sampleCount >= 0) {
    rows.push({ label: "Valid nights", value: String(sampleCount) });
  }
  const average = finiteNumber(output.average_duration_hours);
  if (average !== null && average >= 0 && average <= 24) {
    rows.push({ label: "Average sleep", value: `${average} hours` });
  }
  const regularity = finiteNumber(output.regularity_index);
  if (regularity !== null && regularity >= 0 && regularity <= 1) {
    rows.push({ label: "Regularity index", value: String(regularity) });
  }
  const debt = output.sleep_debt_hours;
  if (typeof debt === "object" && debt !== null && !Array.isArray(debt)) {
    const sevenDayDebt = finiteNumber((debt as Record<string, unknown>)["7d"]);
    if (sevenDayDebt !== null && sevenDayDebt >= 0) {
      rows.push({ label: "7-day sleep debt", value: `${sevenDayDebt} hours` });
    }
  }
  return rows;
}

function percentage(value: unknown): string | null {
  const numeric = finiteNumber(value);
  return numeric !== null && numeric >= 0 && numeric <= 1
    ? `${Math.round(numeric * 100)}%`
    : null;
}

export function presentForecastOutput(value: unknown): MlPresentationRow[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return [];
  const output = value as Record<string, unknown>;
  if (output.causal_claim !== false) return [];
  if (output.estimated_direction !== "higher" && output.estimated_direction !== "lower_or_stable") return [];
  const calibrated = percentage(output.direction_probability);
  if (!calibrated) return [];
  const rows: MlPresentationRow[] = [
    { label: "Estimated next-window direction", value: output.estimated_direction },
    { label: "Calibrated probability", value: calibrated },
  ];
  if (typeof output.component_models === "object" && output.component_models !== null && !Array.isArray(output.component_models)) {
    const components = output.component_models as Record<string, unknown>;
    const structured = percentage(components.structured);
    const residualMlp = percentage(components.residual_mlp);
    if (structured) rows.push({ label: "Structured component", value: structured });
    if (residualMlp) rows.push({ label: "Residual MLP component", value: residualMlp });
  }
  rows.push({ label: "Interpretation", value: "Associational estimate; not causal or diagnostic" });
  return rows;
}
