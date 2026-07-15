from __future__ import annotations

import hashlib
import hmac
import json
import math
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from acnetrex_ml.registry.local_registry import LocalModelRegistry


class ArtifactRejected(ValueError):
    """Raised when a predictive artifact cannot be used safely."""


class Normalization(BaseModel):
    model_config = ConfigDict(extra="forbid")
    mean: list[float]
    scale: list[float]


class LinearModel(BaseModel):
    model_config = ConfigDict(extra="forbid")
    weights: list[float]
    bias: float


class ResidualMlp(BaseModel):
    model_config = ConfigDict(extra="forbid")
    input_weights: list[list[float]]
    input_bias: list[float]
    output_weights: list[float]
    output_bias: float


class EnsembleConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")
    structured_weight: float = Field(ge=0.0, le=1.0)
    ann_weight: float = Field(ge=0.0, le=1.0)
    calibration_slope: float
    calibration_intercept: float
    threshold: float = Field(ge=0.0, le=1.0)

    @model_validator(mode="after")
    def validate_weights(self) -> "EnsembleConfig":
        if not math.isclose(self.structured_weight + self.ann_weight, 1.0, abs_tol=1e-8):
            raise ValueError("ensemble weights must sum to one")
        return self


class EvaluationMetadata(BaseModel):
    model_config = ConfigDict(extra="forbid")
    holdout_kind: Literal["participant_grouped_temporal"]
    calibration_state: Literal["calibrated"]


class PredictiveResult(BaseModel):
    model_config = ConfigDict(extra="forbid")
    probability: float = Field(ge=0.0, le=1.0)
    label: Literal["lower_or_stable", "higher"]
    calibration_state: Literal["calibrated"] = "calibrated"
    component_probabilities: dict[str, float]
    feature_contributions: dict[str, float]
    features_used: list[str]


def _sigmoid(value: float) -> float:
    if value >= 0:
        inverse = math.exp(-value)
        return 1.0 / (1.0 + inverse)
    exponent = math.exp(value)
    return exponent / (1.0 + exponent)


def _dot(left: list[float], right: list[float]) -> float:
    return sum(a * b for a, b in zip(left, right, strict=True))


class PredictiveArtifact(BaseModel):
    model_config = ConfigDict(extra="forbid")
    artifact_format: Literal["acnetrex_predictive_ensemble_v1"]
    model_name: str
    model_version: str
    task: str
    dataset_version: str
    feature_schema_version: str
    feature_names: list[str] = Field(min_length=1)
    normalization: Normalization
    structured_model: LinearModel
    residual_mlp: ResidualMlp
    ensemble: EnsembleConfig
    evaluation: EvaluationMetadata
    limitations: list[str]

    @model_validator(mode="after")
    def validate_dimensions(self) -> "PredictiveArtifact":
        size = len(self.feature_names)
        dimensions = (
            len(self.normalization.mean),
            len(self.normalization.scale),
            len(self.structured_model.weights),
            len(self.residual_mlp.input_weights),
            len(self.residual_mlp.input_bias),
            len(self.residual_mlp.output_weights),
        )
        if any(item != size for item in dimensions):
            raise ValueError("artifact dimensions do not match feature schema")
        if any(len(row) != size for row in self.residual_mlp.input_weights):
            raise ValueError("residual MLP weight matrix must be square")
        if any(value <= 0 or not math.isfinite(value) for value in self.normalization.scale):
            raise ValueError("normalization scale must be finite and positive")
        return self

    def predict(self, inputs: dict[str, Any]) -> PredictiveResult:
        values: list[float] = []
        for name in self.feature_names:
            value = inputs.get(name)
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                raise ArtifactRejected(f"invalid_features:{name}")
            numeric = float(value)
            if not math.isfinite(numeric):
                raise ArtifactRejected(f"invalid_features:{name}")
            values.append(numeric)

        normalized = [
            (value - mean) / scale
            for value, mean, scale in zip(
                values,
                self.normalization.mean,
                self.normalization.scale,
                strict=True,
            )
        ]
        structured_logit = (
            _dot(normalized, self.structured_model.weights)
            + self.structured_model.bias
        )
        hidden = [
            max(0.0, _dot(row, normalized) + bias) + residual
            for row, bias, residual in zip(
                self.residual_mlp.input_weights,
                self.residual_mlp.input_bias,
                normalized,
                strict=True,
            )
        ]
        ann_logit = (
            _dot(hidden, self.residual_mlp.output_weights)
            + self.residual_mlp.output_bias
        )
        structured_probability = _sigmoid(structured_logit)
        ann_probability = _sigmoid(ann_logit)
        blended = (
            self.ensemble.structured_weight * structured_probability
            + self.ensemble.ann_weight * ann_probability
        )
        calibrated = _sigmoid(
            self.ensemble.calibration_slope * math.log(
                max(1e-12, blended) / max(1e-12, 1.0 - blended)
            )
            + self.ensemble.calibration_intercept
        )
        contributions = {
            name: value * weight
            for name, value, weight in zip(
                self.feature_names,
                normalized,
                self.structured_model.weights,
                strict=True,
            )
        }
        return PredictiveResult(
            probability=calibrated,
            label="higher" if calibrated >= self.ensemble.threshold else "lower_or_stable",
            component_probabilities={
                "structured": structured_probability,
                "residual_mlp": ann_probability,
            },
            feature_contributions=contributions,
            features_used=list(self.feature_names),
        )


def load_approved_artifact(
    registry_path: str | Path, *, task: str
) -> PredictiveArtifact:
    registry = LocalModelRegistry(registry_path)
    entries = registry.selectable(task)
    if not entries:
        raise ArtifactRejected("no_approved_model")
    if len(entries) != 1:
        raise ArtifactRejected("ambiguous_approved_model")

    entry = entries[0]
    if not entry.artifact_uri or not entry.artifact_hash:
        raise ArtifactRejected("artifact_reference_missing")
    if "://" in entry.artifact_uri:
        raise ArtifactRejected("remote_artifact_not_materialized")

    root = Path(registry_path).resolve().parent
    artifact_path = (root / entry.artifact_uri).resolve()
    if not artifact_path.is_relative_to(root):
        raise ArtifactRejected("artifact_path_outside_registry_root")
    if not artifact_path.is_file():
        raise ArtifactRejected("artifact_missing")
    digest = hashlib.sha256(artifact_path.read_bytes()).hexdigest()
    if not hmac.compare_digest(digest, entry.artifact_hash.lower()):
        raise ArtifactRejected("artifact_checksum_mismatch")

    try:
        artifact = PredictiveArtifact.model_validate_json(
            artifact_path.read_text(encoding="utf-8")
        )
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        raise ArtifactRejected("artifact_schema_invalid") from exc
    if (
        artifact.task != entry.task
        or artifact.model_name != entry.model_name
        or artifact.model_version != entry.model_version
        or artifact.dataset_version != entry.dataset_version
        or artifact.feature_schema_version != entry.feature_schema_version
    ):
        raise ArtifactRejected("artifact_registry_metadata_mismatch")
    return artifact
