from __future__ import annotations

import pytest


np = pytest.importorskip("numpy")

from acnetrex_ml.pipeline.backbones import (  # noqa: E402
    DERM_FOUNDATION_TERMS_ENV,
    HF_TOKEN_ENV,
    BackboneUnavailable,
    DermFoundationBackbone,
    DeterministicDemoBackbone,
    EmbeddingBackbone,
    _png_dimensions,
)


def test_demo_backbone_is_marked_demo_only() -> None:
    backbone = DeterministicDemoBackbone(embedding_dim=16, n_classes=3, seed=7)
    assert backbone.demo_only is True
    assert backbone.production_approved is False
    assert isinstance(backbone, EmbeddingBackbone)
    assert "demo" in backbone.name


def test_demo_backbone_deterministic_across_instances() -> None:
    refs = [
        DeterministicDemoBackbone.make_ref("g-000", f"img-{i}", i % 3) for i in range(6)
    ]
    first = DeterministicDemoBackbone(embedding_dim=32, n_classes=3, seed=42)
    second = DeterministicDemoBackbone(embedding_dim=32, n_classes=3, seed=42)
    np.testing.assert_array_equal(first.embed_batch(refs), second.embed_batch(refs))
    other_seed = DeterministicDemoBackbone(embedding_dim=32, n_classes=3, seed=43)
    assert not np.array_equal(first.embed_batch(refs), other_seed.embed_batch(refs))


def test_demo_backbone_batch_shape_and_ref_roundtrip() -> None:
    backbone = DeterministicDemoBackbone(embedding_dim=24, n_classes=4, seed=1)
    ref = DeterministicDemoBackbone.make_ref("group-a", "img-001", 2)
    assert DeterministicDemoBackbone.parse_ref(ref) == ("group-a", "img-001", 2)
    matrix = backbone.embed_batch([ref, ref])
    assert matrix.shape == (2, 24)
    with pytest.raises(ValueError, match="not_a_demo_ref"):
        DeterministicDemoBackbone.parse_ref("s3://real-bucket/image.png")


def test_derm_foundation_blocked_without_hf_token(monkeypatch) -> None:
    monkeypatch.delenv(HF_TOKEN_ENV, raising=False)
    monkeypatch.delenv(DERM_FOUNDATION_TERMS_ENV, raising=False)
    backbone = DermFoundationBackbone()
    status = backbone.availability()
    assert status["available"] is False
    assert "hf_token_missing" in status["reasons"]
    assert "derm_foundation_terms_not_accepted" in status["reasons"]
    with pytest.raises(BackboneUnavailable):
        backbone.ensure_available()


def test_derm_foundation_blocked_without_terms_acceptance(monkeypatch) -> None:
    monkeypatch.setenv(HF_TOKEN_ENV, "unit-test-placeholder-token")
    monkeypatch.delenv(DERM_FOUNDATION_TERMS_ENV, raising=False)
    backbone = DermFoundationBackbone()
    status = backbone.availability()
    assert status["available"] is False
    assert status["reasons"] == ["derm_foundation_terms_not_accepted"]


def test_derm_foundation_never_downloads_when_gated(monkeypatch) -> None:
    monkeypatch.delenv(HF_TOKEN_ENV, raising=False)
    monkeypatch.delenv(DERM_FOUNDATION_TERMS_ENV, raising=False)
    backbone = DermFoundationBackbone(accept_terms=True)
    with pytest.raises(BackboneUnavailable) as excinfo:
        backbone.download()
    assert "hf_token_missing" in excinfo.value.reasons
    with pytest.raises(BackboneUnavailable):
        backbone.embed_batch(["/tmp/does-not-matter.png"])


def test_derm_foundation_constants_and_markers() -> None:
    backbone = DermFoundationBackbone()
    assert backbone.embedding_dim == 6144
    assert backbone.input_size == 448
    assert backbone.demo_only is False
    assert backbone.production_approved is False
    assert isinstance(backbone, EmbeddingBackbone)


def test_png_dimension_parser() -> None:
    header = (
        b"\x89PNG\r\n\x1a\n"
        + (13).to_bytes(4, "big")
        + b"IHDR"
        + (448).to_bytes(4, "big")
        + (448).to_bytes(4, "big")
    )
    assert _png_dimensions(header) == (448, 448)
    with pytest.raises(ValueError, match="not_a_png"):
        _png_dimensions(b"JPEG-nonsense")
