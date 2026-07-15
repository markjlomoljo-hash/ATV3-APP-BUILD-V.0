from __future__ import annotations

from collections.abc import Callable
from typing import Any

from .barrier_guard import analyze_barrier
from .context import analyze_climate, analyze_contact, analyze_cycle, analyze_sweat
from .dermdiet import analyze_diet_day
from .faceatlas_quality import assess_faceatlas_quality
from .forecast import analyze_forecast_readiness
from .formula_lens import analyze_formula
from .readiness import assess_readiness
from .skin_twin import validate_skin_twin
from .sleepderm import analyze_sleep
from .treatment_adherence import analyze_adherence
from .trigger_graph import analyze_trigger

Engine = Callable[[dict[str, Any]], dict[str, Any]]


def _sleep(inputs: dict[str, Any]) -> dict[str, Any]:
    records = inputs.get("records", [])
    if not isinstance(records, list):
        raise ValueError("records must be an array")
    return analyze_sleep(records, float(inputs.get("target_hours", 8.0)))


def _readiness(inputs: dict[str, Any]) -> dict[str, Any]:
    records = inputs.get("records", [])
    required_fields = inputs.get("required_fields", [])
    if not isinstance(records, list) or not isinstance(required_fields, list):
        raise ValueError("records and required_fields must be arrays")
    return assess_readiness(
        records,
        required_fields=[str(value) for value in required_fields],
        minimum_samples=max(1, int(inputs.get("minimum_samples", 1))),
        minimum_span_days=max(0, int(inputs.get("minimum_span_days", 0))),
    )


def _cutisai_retrieval(inputs: dict[str, Any]) -> dict[str, Any]:
    facts = inputs.get("retrieved_facts", [])
    if not isinstance(facts, list) or not facts:
        return {
            "state": "evidence_unavailable",
            "features_missing": ["owner_scoped_evidence"],
            "limitations": [
                "No owner-scoped evidence was available, so no assistant answer was generated."
            ],
        }
    return {
        "state": "ready",
        "retrieval_only": True,
        "retrieved_facts": facts,
        "answer": None,
        "sample_count": len(facts),
        "evidence_state": "available",
        "limitations": [
            "This bootstrap path returns validated owner-scoped evidence only.",
            "No language model answer is generated unless an approved managed provider is configured.",
        ],
    }


ENGINES: dict[tuple[str, str], Engine] = {
    ("readiness", "module_readiness"): _readiness,
    ("sleepderm", "sleep_pattern_analysis"): _sleep,
    ("dermdiet", "daily_completeness"): analyze_diet_day,
    ("triggergraph", "association_analysis"): analyze_trigger,
    ("forecast", "readiness"): analyze_forecast_readiness,
    ("skin_twin", "scenario_validation"): validate_skin_twin,
    ("faceatlas", "capture_quality"): assess_faceatlas_quality,
    ("barrier_guard", "symptom_summary"): analyze_barrier,
    ("formula_lens", "ingredient_review"): analyze_formula,
    ("climate_skin", "context_summary"): analyze_climate,
    ("sweat_flow", "context_summary"): analyze_sweat,
    ("cycle_sync", "context_summary"): analyze_cycle,
    ("contact_guard", "context_summary"): analyze_contact,
    ("treatment_adherence", "consistency_summary"): analyze_adherence,
    ("cutisai", "evidence_assistance"): _cutisai_retrieval,
}


def dispatch_deterministic(
    module: str, task: str, inputs: dict[str, Any]
) -> dict[str, Any] | None:
    engine = ENGINES.get((module, task))
    return engine(inputs) if engine else None
