"""scikit-learn classification head: calibration, grouped splits, abstention.

Pure functions plus small frozen dataclasses. Heavy imports are deferred to
call time so this module can be imported without scikit-learn or numpy
installed (the service must run without pipeline extras).
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any

from acnetrex_ml.pipeline._deps import require


ABSTAIN_LABEL = "abstain"


@dataclass(frozen=True)
class HeadConfig:
    """Configuration for the calibrated logistic-regression head."""

    c: float = 1.0
    max_iter: int = 2000
    calibration_method: str = "sigmoid"
    calibration_cv: int = 3
    abstention_threshold: float = 0.5
    seed: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "estimator": "logistic_regression",
            "c": self.c,
            "max_iter": self.max_iter,
            "calibration_method": self.calibration_method,
            "calibration_cv": self.calibration_cv,
            "abstention_threshold": self.abstention_threshold,
            "seed": self.seed,
        }


@dataclass(frozen=True)
class GroupedSplit:
    """Index arrays for identity-grouped train/val/test splits."""

    train: Any
    val: Any
    test: Any


def build_head(config: HeadConfig) -> Any:
    """Build a CalibratedClassifierCV over LogisticRegression."""
    calibration = require("sklearn.calibration", feature="classification head")
    linear_model = require("sklearn.linear_model", feature="classification head")
    base = linear_model.LogisticRegression(
        C=config.c,
        max_iter=config.max_iter,
        random_state=config.seed,
    )
    return calibration.CalibratedClassifierCV(
        estimator=base,
        method=config.calibration_method,
        cv=config.calibration_cv,
    )


def grouped_train_val_test_split(
    groups: Sequence[str],
    *,
    val_fraction: float = 0.2,
    test_fraction: float = 0.2,
    seed: int = 0,
) -> GroupedSplit:
    """Split sample indices so no group identity crosses split boundaries."""
    np = require("numpy", feature="grouped splitting")
    model_selection = require("sklearn.model_selection", feature="grouped splitting")
    if not 0 < val_fraction < 1 or not 0 < test_fraction < 1:
        raise ValueError("fractions must be in (0, 1)")
    if val_fraction + test_fraction >= 1:
        raise ValueError("val_fraction + test_fraction must be < 1")
    group_array = np.asarray(groups)
    indices = np.arange(len(group_array))
    outer = model_selection.GroupShuffleSplit(
        n_splits=1, test_size=test_fraction, random_state=seed
    )
    remaining_idx, test_idx = next(outer.split(indices, groups=group_array))
    inner_fraction = val_fraction / (1.0 - test_fraction)
    inner = model_selection.GroupShuffleSplit(
        n_splits=1, test_size=inner_fraction, random_state=seed + 1
    )
    train_pos, val_pos = next(
        inner.split(remaining_idx, groups=group_array[remaining_idx])
    )
    split = GroupedSplit(
        train=np.sort(remaining_idx[train_pos]),
        val=np.sort(remaining_idx[val_pos]),
        test=np.sort(test_idx),
    )
    assert_no_group_leakage(group_array, split)
    return split


def assert_no_group_leakage(groups: Sequence[str], split: GroupedSplit) -> None:
    """Raise ValueError if any group identity appears in more than one split."""
    np = require("numpy", feature="grouped splitting")
    group_array = np.asarray(groups)
    named = {
        "train": set(group_array[split.train].tolist()),
        "val": set(group_array[split.val].tolist()),
        "test": set(group_array[split.test].tolist()),
    }
    pairs = [("train", "val"), ("train", "test"), ("val", "test")]
    for left, right in pairs:
        overlap = named[left] & named[right]
        if overlap:
            raise ValueError(f"group_leakage:{left}/{right}:{sorted(overlap)[:5]!r}")


def predict_with_abstention(
    probabilities: Any,
    classes: Sequence[str],
    *,
    threshold: float,
) -> dict[str, Any]:
    """Argmax prediction with explicit abstention below a max-prob threshold.

    Returns predicted labels (with :data:`ABSTAIN_LABEL` where the model is
    not confident enough), the raw argmax labels, per-row confidences, the
    abstention mask, and the abstention rate.
    """
    np = require("numpy", feature="abstention prediction")
    proba = np.asarray(probabilities, dtype=float)
    if proba.ndim != 2 or proba.shape[1] != len(classes):
        raise ValueError("probabilities must be (n_samples, n_classes)")
    confidences = proba.max(axis=1)
    argmax_labels = [str(classes[i]) for i in proba.argmax(axis=1)]
    abstained = confidences < threshold
    predicted = [
        ABSTAIN_LABEL if flag else label
        for flag, label in zip(abstained.tolist(), argmax_labels)
    ]
    n = len(predicted)
    return {
        "predicted": predicted,
        "argmax": argmax_labels,
        "confidences": confidences,
        "abstained": abstained,
        "abstention_rate": float(abstained.mean()) if n else 0.0,
        "threshold": float(threshold),
    }


def reliability_curve(
    confidences: Any,
    correct: Any,
    *,
    n_bins: int = 10,
) -> dict[str, Any]:
    """Confidence-vs-accuracy reliability points and expected calibration error.

    Bins the per-sample top-class confidence into ``n_bins`` equal-width bins
    over [0, 1]; each non-empty bin reports mean confidence, empirical
    accuracy, and count. ECE is the count-weighted mean absolute gap.
    """
    np = require("numpy", feature="reliability curve")
    conf = np.asarray(confidences, dtype=float)
    hit = np.asarray(correct, dtype=float)
    if conf.shape != hit.shape:
        raise ValueError("confidences and correct must have identical shape")
    if conf.size == 0:
        return {"points": [], "ece": None, "n_bins": n_bins}
    edges = np.linspace(0.0, 1.0, n_bins + 1)
    points: list[dict[str, Any]] = []
    weighted_gap = 0.0
    for i in range(n_bins):
        lower, upper = float(edges[i]), float(edges[i + 1])
        if i == n_bins - 1:
            mask = (conf >= lower) & (conf <= upper)
        else:
            mask = (conf >= lower) & (conf < upper)
        count = int(mask.sum())
        if count == 0:
            continue
        mean_conf = float(conf[mask].mean())
        accuracy = float(hit[mask].mean())
        weighted_gap += abs(accuracy - mean_conf) * count
        points.append(
            {
                "bin_lower": round(lower, 6),
                "bin_upper": round(upper, 6),
                "mean_confidence": round(mean_conf, 6),
                "empirical_accuracy": round(accuracy, 6),
                "count": count,
            }
        )
    return {
        "points": points,
        "ece": round(weighted_gap / conf.size, 6),
        "n_bins": n_bins,
    }


def evaluate_predictions(
    y_true: Sequence[str],
    probabilities: Any,
    classes: Sequence[str],
    *,
    threshold: float,
    n_bins: int = 10,
) -> dict[str, Any]:
    """Compute accuracy, per-class F1, reliability, and abstention metrics."""
    np = require("numpy", feature="evaluation metrics")
    metrics = require("sklearn.metrics", feature="evaluation metrics")
    truth = [str(label) for label in y_true]
    abstention = predict_with_abstention(probabilities, classes, threshold=threshold)
    argmax = abstention["argmax"]
    correct = np.asarray(
        [pred == true for pred, true in zip(argmax, truth)], dtype=float
    )
    per_class_f1 = metrics.f1_score(
        truth, argmax, labels=list(classes), average=None, zero_division=0
    )
    answered = ~abstention["abstained"]
    answered_correct = correct[answered]
    return {
        "n_samples": len(truth),
        "accuracy": round(float(correct.mean()), 6) if truth else None,
        "per_class_f1": {
            str(label): round(float(score), 6)
            for label, score in zip(classes, per_class_f1)
        },
        "reliability": reliability_curve(
            abstention["confidences"], correct, n_bins=n_bins
        ),
        "abstention": {
            "threshold": abstention["threshold"],
            "abstention_rate": round(abstention["abstention_rate"], 6),
            "coverage": round(float(answered.mean()), 6) if truth else None,
            "n_answered": int(answered.sum()),
            "accuracy_on_answered": (
                round(float(answered_correct.mean()), 6)
                if answered_correct.size
                else None
            ),
        },
    }
