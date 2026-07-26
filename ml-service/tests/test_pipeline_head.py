from __future__ import annotations

import pytest


np = pytest.importorskip("numpy")
pytest.importorskip("sklearn")

from acnetrex_ml.pipeline.head import (  # noqa: E402
    ABSTAIN_LABEL,
    GroupedSplit,
    HeadConfig,
    assert_no_group_leakage,
    build_head,
    evaluate_predictions,
    grouped_train_val_test_split,
    predict_with_abstention,
    reliability_curve,
)


def test_grouped_split_has_no_group_leakage() -> None:
    rng = np.random.default_rng(0)
    groups = [f"subject-{rng.integers(0, 20):02d}" for _ in range(200)]
    split = grouped_train_val_test_split(groups, seed=3)
    group_array = np.asarray(groups)
    train_groups = set(group_array[split.train])
    val_groups = set(group_array[split.val])
    test_groups = set(group_array[split.test])
    assert not train_groups & val_groups
    assert not train_groups & test_groups
    assert not val_groups & test_groups
    all_indices = np.concatenate([split.train, split.val, split.test])
    assert sorted(all_indices.tolist()) == list(range(200))


def test_assert_no_group_leakage_detects_overlap() -> None:
    groups = ["a", "a", "b", "b", "c", "c"]
    leaky = GroupedSplit(
        train=np.array([0, 2]), val=np.array([1, 4]), test=np.array([3, 5])
    )
    with pytest.raises(ValueError, match="group_leakage"):
        assert_no_group_leakage(groups, leaky)


def test_grouped_split_rejects_bad_fractions() -> None:
    with pytest.raises(ValueError):
        grouped_train_val_test_split(["a", "b"], val_fraction=0.6, test_fraction=0.6)


def test_abstention_threshold_behavior() -> None:
    proba = np.array([[0.90, 0.10], [0.55, 0.45], [0.49, 0.51]])
    classes = ["mild", "severe"]

    strict = predict_with_abstention(proba, classes, threshold=0.6)
    assert strict["predicted"] == ["mild", ABSTAIN_LABEL, ABSTAIN_LABEL]
    assert strict["abstention_rate"] == pytest.approx(2 / 3)

    permissive = predict_with_abstention(proba, classes, threshold=0.0)
    assert permissive["predicted"] == ["mild", "mild", "severe"]
    assert permissive["abstention_rate"] == 0.0

    impossible = predict_with_abstention(proba, classes, threshold=1.01)
    assert impossible["predicted"] == [ABSTAIN_LABEL] * 3
    assert impossible["abstention_rate"] == 1.0


def test_reliability_curve_sanity() -> None:
    confidences = np.array([1.0, 1.0, 0.5, 0.5])
    correct = np.array([1.0, 1.0, 0.0, 1.0])
    curve = reliability_curve(confidences, correct, n_bins=10)
    assert sum(point["count"] for point in curve["points"]) == 4
    for point in curve["points"]:
        assert 0.0 <= point["mean_confidence"] <= 1.0
        assert 0.0 <= point["empirical_accuracy"] <= 1.0
    assert 0.0 <= curve["ece"] <= 1.0

    perfect = reliability_curve(np.ones(8), np.ones(8), n_bins=5)
    assert perfect["ece"] == 0.0

    empty = reliability_curve(np.array([]), np.array([]))
    assert empty["points"] == [] and empty["ece"] is None


def test_head_fit_produces_calibrated_probabilities() -> None:
    rng = np.random.default_rng(11)
    n_per_class = 30
    features = np.vstack(
        [
            rng.normal(loc=-2.0, size=(n_per_class, 8)),
            rng.normal(loc=2.0, size=(n_per_class, 8)),
        ]
    )
    labels = np.array(["low"] * n_per_class + ["high"] * n_per_class)
    model = build_head(HeadConfig(calibration_cv=3, seed=0))
    model.fit(features, labels)
    proba = model.predict_proba(features)
    assert proba.shape == (2 * n_per_class, 2)
    np.testing.assert_allclose(proba.sum(axis=1), 1.0, atol=1e-9)
    assert ((proba >= 0.0) & (proba <= 1.0)).all()


def test_evaluate_predictions_output_shape() -> None:
    proba = np.array([[0.8, 0.2], [0.3, 0.7], [0.52, 0.48]])
    result = evaluate_predictions(["a", "b", "b"], proba, ["a", "b"], threshold=0.6)
    assert result["n_samples"] == 3
    assert result["accuracy"] == pytest.approx(2 / 3)
    assert set(result["per_class_f1"]) == {"a", "b"}
    assert result["abstention"]["n_answered"] == 2
    assert result["abstention"]["accuracy_on_answered"] == pytest.approx(1.0)
    assert result["abstention"]["coverage"] == pytest.approx(2 / 3)
    assert result["reliability"]["points"]
