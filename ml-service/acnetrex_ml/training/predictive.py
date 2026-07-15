from __future__ import annotations

import hashlib
import json
import math
import random
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from acnetrex_ml.predictive.artifact import PredictiveArtifact, _sigmoid
from acnetrex_ml.training.gate import prepare_training_run


class TrainingDataRejected(ValueError):
    """Raised when governed training input is unsafe or malformed."""


@dataclass(frozen=True)
class DatasetSplit:
    train: list[dict[str, Any]]
    calibration: list[dict[str, Any]]
    holdout: list[dict[str, Any]]


@dataclass(frozen=True)
class TrainingOutcome:
    artifact: PredictiveArtifact
    metrics: dict[str, dict[str, float]]
    automatic_promotion: bool = False


def export_candidate_bundle(
    outcome: TrainingOutcome, output_directory: str | Path
) -> dict[str, Any]:
    output = Path(output_directory).resolve()
    artifacts = output / "artifacts"
    reports = output / "reports"
    artifacts.mkdir(parents=True, exist_ok=True)
    reports.mkdir(parents=True, exist_ok=True)
    safe_stem = "-".join(
        part
        for part in f"{outcome.artifact.model_name}-{outcome.artifact.model_version}".replace(
            "_", "-"
        ).split("-")
        if part.isalnum()
    )
    if not safe_stem:
        raise TrainingDataRejected("invalid_artifact_filename")
    artifact_path = artifacts / f"{safe_stem}.json"
    artifact_path.write_text(
        outcome.artifact.model_dump_json(indent=2) + "\n", encoding="utf-8"
    )
    digest = hashlib.sha256(artifact_path.read_bytes()).hexdigest()
    evaluation_path = reports / f"{safe_stem}-evaluation.json"
    evaluation_path.write_text(
        json.dumps(
            {
                "model_name": outcome.artifact.model_name,
                "model_version": outcome.artifact.model_version,
                "dataset_version": outcome.artifact.dataset_version,
                "holdout_kind": outcome.artifact.evaluation.holdout_kind,
                "metrics": outcome.metrics,
                "automatic_promotion": False,
                "limitations": outcome.artifact.limitations,
            },
            indent=2,
            sort_keys=True,
        )
        + "\n",
        encoding="utf-8",
    )
    model_card_path = reports / f"{safe_stem}-model-card.md"
    model_card_path.write_text(
        "\n".join(
            [
                f"# {outcome.artifact.model_name} {outcome.artifact.model_version}",
                "",
                "Status: candidate; manual clinical, privacy, fairness, and security review required.",
                "",
                "This model is an associational next-window estimator, not a diagnostic or causal model.",
                "",
                "## Limitations",
                "",
                *(f"- {item}" for item in outcome.artifact.limitations),
                "",
            ]
        ),
        encoding="utf-8",
    )
    created_at = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    registry_entry = {
        "model_name": outcome.artifact.model_name,
        "model_version": outcome.artifact.model_version,
        "status": "candidate",
        "task": outcome.artifact.task,
        "runtime_targets": ["cloud_run"],
        "artifact_uri": artifact_path.relative_to(output).as_posix(),
        "artifact_hash": digest,
        "dataset_version": outcome.artifact.dataset_version,
        "feature_schema_version": outcome.artifact.feature_schema_version,
        "label_schema_version": "1.0.0",
        "training_run_id": safe_stem,
        "evaluation_report": evaluation_path.relative_to(output).as_posix(),
        "model_card": model_card_path.relative_to(output).as_posix(),
        "created_at": created_at,
        "approved_at": None,
        "approval_state": "pending_manual_review",
        "limitations": outcome.artifact.limitations,
    }
    return {
        "artifact_path": str(artifact_path),
        "artifact_sha256": digest,
        "evaluation_path": str(evaluation_path),
        "registry_entry": registry_entry,
        "automatic_promotion": False,
    }


def grouped_temporal_split(rows: list[dict[str, Any]]) -> DatasetSplit:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        participant = row.get("participant_id")
        observed_at = row.get("observed_at")
        if not isinstance(participant, str) or not participant:
            raise TrainingDataRejected("participant_id_required")
        if not isinstance(observed_at, str) or not observed_at:
            raise TrainingDataRejected("observed_at_required")
        grouped.setdefault(participant, []).append(row)
    if len(grouped) < 10:
        raise TrainingDataRejected("at_least_ten_participants_required")

    participants = sorted(
        grouped, key=lambda item: max(str(row["observed_at"]) for row in grouped[item])
    )
    train_end = max(1, int(len(participants) * 0.6))
    calibration_end = max(train_end + 1, int(len(participants) * 0.8))
    if calibration_end >= len(participants):
        raise TrainingDataRejected("insufficient_participants_for_holdout")

    def collect(ids: list[str]) -> list[dict[str, Any]]:
        return sorted(
            (row for participant in ids for row in grouped[participant]),
            key=lambda row: (str(row["observed_at"]), str(row["participant_id"])),
        )

    return DatasetSplit(
        train=collect(participants[:train_end]),
        calibration=collect(participants[train_end:calibration_end]),
        holdout=collect(participants[calibration_end:]),
    )


def _matrix(
    rows: list[dict[str, Any]], feature_names: list[str]
) -> tuple[list[list[float]], list[int]]:
    inputs: list[list[float]] = []
    labels: list[int] = []
    for row in rows:
        values: list[float] = []
        for name in feature_names:
            value = row.get(name)
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                raise TrainingDataRejected(f"numeric_feature_required:{name}")
            numeric = float(value)
            if not math.isfinite(numeric):
                raise TrainingDataRejected(f"finite_feature_required:{name}")
            values.append(numeric)
        label = row.get("label")
        if isinstance(label, bool):
            label = int(label)
        if label not in {0, 1}:
            raise TrainingDataRejected("binary_label_required")
        inputs.append(values)
        labels.append(int(label))
    if len(set(labels)) < 2:
        raise TrainingDataRejected("both_label_classes_required")
    return inputs, labels


def _normalize_fit(inputs: list[list[float]]) -> tuple[list[float], list[float]]:
    columns = list(zip(*inputs, strict=True))
    means = [sum(column) / len(column) for column in columns]
    scales = []
    for column, mean in zip(columns, means, strict=True):
        variance = sum((value - mean) ** 2 for value in column) / len(column)
        scales.append(max(math.sqrt(variance), 1e-8))
    return means, scales


def _normalize(
    inputs: list[list[float]], means: list[float], scales: list[float]
) -> list[list[float]]:
    return [
        [
            (value - mean) / scale
            for value, mean, scale in zip(row, means, scales, strict=True)
        ]
        for row in inputs
    ]


def _linear_probabilities(
    inputs: list[list[float]], weights: list[float], bias: float
) -> list[float]:
    return [
        _sigmoid(
            sum(value * weight for value, weight in zip(row, weights, strict=True))
            + bias
        )
        for row in inputs
    ]


def _fit_logistic(
    inputs: list[list[float]], labels: list[int], *, epochs: int, rate: float
) -> tuple[list[float], float]:
    weights = [0.0] * len(inputs[0])
    bias = 0.0
    for _ in range(epochs):
        probabilities = _linear_probabilities(inputs, weights, bias)
        errors = [
            probability - label
            for probability, label in zip(probabilities, labels, strict=True)
        ]
        divisor = float(len(inputs))
        weights = [
            weight
            - rate
            * (
                sum(
                    error * row[index]
                    for error, row in zip(errors, inputs, strict=True)
                )
                / divisor
                + 0.001 * weight
            )
            for index, weight in enumerate(weights)
        ]
        bias -= rate * sum(errors) / divisor
    return weights, bias


def _ann_probabilities(
    inputs: list[list[float]],
    matrix: list[list[float]],
    hidden_bias: list[float],
    output_weights: list[float],
    output_bias: float,
) -> list[float]:
    probabilities: list[float] = []
    for row in inputs:
        hidden = [
            max(
                0.0,
                sum(weight * value for weight, value in zip(weights, row, strict=True))
                + bias,
            )
            + residual
            for weights, bias, residual in zip(matrix, hidden_bias, row, strict=True)
        ]
        probabilities.append(
            _sigmoid(
                sum(
                    value * weight
                    for value, weight in zip(hidden, output_weights, strict=True)
                )
                + output_bias
            )
        )
    return probabilities


def _fit_residual_mlp(
    inputs: list[list[float]], labels: list[int], *, epochs: int, seed: int
) -> tuple[list[list[float]], list[float], list[float], float]:
    randomizer = random.Random(seed)
    size = len(inputs[0])
    matrix = [[randomizer.uniform(-0.1, 0.1) for _ in range(size)] for _ in range(size)]
    hidden_bias = [0.0] * size
    output_weights = [randomizer.uniform(-0.1, 0.1) for _ in range(size)]
    output_bias = 0.0
    rate = 0.035
    divisor = float(len(inputs))
    for _ in range(epochs):
        matrix_gradient = [[0.0] * size for _ in range(size)]
        hidden_bias_gradient = [0.0] * size
        output_gradient = [0.0] * size
        output_bias_gradient = 0.0
        for row, label in zip(inputs, labels, strict=True):
            preactivation = [
                sum(weight * value for weight, value in zip(weights, row, strict=True))
                + bias
                for weights, bias in zip(matrix, hidden_bias, strict=True)
            ]
            hidden = [
                max(0.0, value) + residual
                for value, residual in zip(preactivation, row, strict=True)
            ]
            probability = _sigmoid(
                sum(
                    value * weight
                    for value, weight in zip(hidden, output_weights, strict=True)
                )
                + output_bias
            )
            error = probability - label
            for hidden_index in range(size):
                output_gradient[hidden_index] += error * hidden[hidden_index]
                if preactivation[hidden_index] > 0:
                    upstream = error * output_weights[hidden_index]
                    hidden_bias_gradient[hidden_index] += upstream
                    for feature_index in range(size):
                        matrix_gradient[hidden_index][feature_index] += (
                            upstream * row[feature_index]
                        )
            output_bias_gradient += error
        for hidden_index in range(size):
            output_weights[hidden_index] -= rate * (
                output_gradient[hidden_index] / divisor
                + 0.001 * output_weights[hidden_index]
            )
            hidden_bias[hidden_index] -= (
                rate * hidden_bias_gradient[hidden_index] / divisor
            )
            for feature_index in range(size):
                matrix[hidden_index][feature_index] -= rate * (
                    matrix_gradient[hidden_index][feature_index] / divisor
                    + 0.001 * matrix[hidden_index][feature_index]
                )
        output_bias -= rate * output_bias_gradient / divisor
    return matrix, hidden_bias, output_weights, output_bias


def _fit_calibration(
    probabilities: list[float], labels: list[int]
) -> tuple[float, float]:
    logits = [
        math.log(max(1e-8, value) / max(1e-8, 1.0 - value)) for value in probabilities
    ]
    slope = 1.0
    intercept = 0.0
    for _ in range(200):
        predictions = [_sigmoid(slope * value + intercept) for value in logits]
        errors = [
            prediction - label
            for prediction, label in zip(predictions, labels, strict=True)
        ]
        divisor = float(len(labels))
        slope -= (
            0.03
            * sum(error * value for error, value in zip(errors, logits, strict=True))
            / divisor
        )
        intercept -= 0.03 * sum(errors) / divisor
    return slope, intercept


def _average_precision(probabilities: list[float], labels: list[int]) -> float:
    positives = sum(labels)
    if positives == 0:
        return 0.0
    ranked = sorted(zip(probabilities, labels, strict=True), reverse=True)
    true_positives = 0
    precision_sum = 0.0
    for rank, (_, label) in enumerate(ranked, start=1):
        if label:
            true_positives += 1
            precision_sum += true_positives / rank
    return precision_sum / positives


def _metrics(probabilities: list[float], labels: list[int]) -> dict[str, float]:
    brier = sum(
        (probability - label) ** 2
        for probability, label in zip(probabilities, labels, strict=True)
    ) / len(labels)
    calibration_error = 0.0
    for lower in (0.0, 0.2, 0.4, 0.6, 0.8):
        bucket = [
            (probability, label)
            for probability, label in zip(probabilities, labels, strict=True)
            if lower <= probability < lower + 0.2
            or (lower == 0.8 and probability == 1.0)
        ]
        if bucket:
            confidence = sum(item[0] for item in bucket) / len(bucket)
            frequency = sum(item[1] for item in bucket) / len(bucket)
            calibration_error += len(bucket) / len(labels) * abs(confidence - frequency)
    return {
        "average_precision": _average_precision(probabilities, labels),
        "brier": brier,
        "expected_calibration_error": calibration_error,
    }


def train_predictive_ensemble(
    rows: list[dict[str, Any]],
    *,
    feature_names: list[str],
    task: str,
    model_name: str,
    model_version: str,
    dataset_version: str,
    epochs: int = 300,
    seed: int = 17,
) -> TrainingOutcome:
    if not feature_names or len(set(feature_names)) != len(feature_names):
        raise TrainingDataRejected("unique_feature_names_required")
    if epochs < 1:
        raise TrainingDataRejected("positive_epoch_count_required")
    split = grouped_temporal_split(rows)
    train_inputs, train_labels = _matrix(split.train, feature_names)
    calibration_inputs, calibration_labels = _matrix(split.calibration, feature_names)
    holdout_inputs, holdout_labels = _matrix(split.holdout, feature_names)
    means, scales = _normalize_fit(train_inputs)
    normalized_train = _normalize(train_inputs, means, scales)
    normalized_calibration = _normalize(calibration_inputs, means, scales)
    normalized_holdout = _normalize(holdout_inputs, means, scales)

    linear_weights, linear_bias = _fit_logistic(
        normalized_train, train_labels, epochs=epochs, rate=0.05
    )
    matrix, hidden_bias, output_weights, output_bias = _fit_residual_mlp(
        normalized_train, train_labels, epochs=epochs, seed=seed
    )
    calibration_linear = _linear_probabilities(
        normalized_calibration, linear_weights, linear_bias
    )
    calibration_ann = _ann_probabilities(
        normalized_calibration, matrix, hidden_bias, output_weights, output_bias
    )
    candidate_weights = [index / 10 for index in range(11)]
    structured_weight = min(
        candidate_weights,
        key=lambda weight: sum(
            ((weight * linear + (1.0 - weight) * ann) - label) ** 2
            for linear, ann, label in zip(
                calibration_linear, calibration_ann, calibration_labels, strict=True
            )
        ),
    )
    blended_calibration = [
        structured_weight * linear + (1.0 - structured_weight) * ann
        for linear, ann in zip(calibration_linear, calibration_ann, strict=True)
    ]
    calibration_slope, calibration_intercept = _fit_calibration(
        blended_calibration, calibration_labels
    )

    artifact = PredictiveArtifact.model_validate(
        {
            "artifact_format": "acnetrex_predictive_ensemble_v1",
            "model_name": model_name,
            "model_version": model_version,
            "task": task,
            "dataset_version": dataset_version,
            "feature_schema_version": "1.0.0",
            "feature_names": feature_names,
            "normalization": {"mean": means, "scale": scales},
            "structured_model": {"weights": linear_weights, "bias": linear_bias},
            "residual_mlp": {
                "input_weights": matrix,
                "input_bias": hidden_bias,
                "output_weights": output_weights,
                "output_bias": output_bias,
            },
            "ensemble": {
                "structured_weight": structured_weight,
                "ann_weight": 1.0 - structured_weight,
                "calibration_slope": calibration_slope,
                "calibration_intercept": calibration_intercept,
                "threshold": 0.5,
            },
            "evaluation": {
                "holdout_kind": "participant_grouped_temporal",
                "calibration_state": "calibrated",
            },
            "limitations": [
                "Associational next-window estimate; not a diagnosis or causal claim.",
                "Candidate requires independent review and manual registry approval.",
            ],
        }
    )
    holdout_linear = _linear_probabilities(
        normalized_holdout, linear_weights, linear_bias
    )
    holdout_ann = _ann_probabilities(
        normalized_holdout, matrix, hidden_bias, output_weights, output_bias
    )
    holdout_blended = [
        structured_weight * linear + (1.0 - structured_weight) * ann
        for linear, ann in zip(holdout_linear, holdout_ann, strict=True)
    ]
    holdout_calibrated = [
        _sigmoid(
            calibration_slope * math.log(max(1e-8, value) / max(1e-8, 1.0 - value))
            + calibration_intercept
        )
        for value in holdout_blended
    ]
    return TrainingOutcome(
        artifact=artifact,
        metrics={
            "structured_baseline": _metrics(holdout_linear, holdout_labels),
            "residual_mlp": _metrics(holdout_ann, holdout_labels),
            "ensemble": _metrics(holdout_calibrated, holdout_labels),
        },
    )


def run_governed_training(
    manifest_path: str | Path,
    *,
    task: str,
    feature_names: list[str],
    model_name: str,
    model_version: str,
    materialized_snapshot_path: str | Path,
    epochs: int = 300,
    seed: int = 17,
) -> TrainingOutcome:
    plan = prepare_training_run(manifest_path, task=task)
    snapshot = Path(materialized_snapshot_path).resolve()
    if not snapshot.is_file():
        raise TrainingDataRejected("snapshot_missing")
    digest = hashlib.sha256(snapshot.read_bytes()).hexdigest()
    if digest != str(plan["snapshot_sha256"]).lower():
        raise TrainingDataRejected("snapshot_checksum_mismatch")
    try:
        rows = [
            json.loads(line)
            for line in snapshot.read_text(encoding="utf-8").splitlines()
            if line.strip()
        ]
    except (OSError, json.JSONDecodeError) as exc:
        raise TrainingDataRejected("snapshot_jsonl_invalid") from exc
    if not all(isinstance(row, dict) for row in rows):
        raise TrainingDataRejected("snapshot_rows_must_be_objects")
    return train_predictive_ensemble(
        rows,
        feature_names=feature_names,
        task=task,
        model_name=model_name,
        model_version=model_version,
        dataset_version=f"{plan['dataset_name']}:{plan['dataset_version']}",
        epochs=epochs,
        seed=seed,
    )
