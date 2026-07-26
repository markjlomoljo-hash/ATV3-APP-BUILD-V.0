"""Embedding backbones for the acne-severity pipeline scaffold.

Two implementations of the :class:`EmbeddingBackbone` protocol:

* :class:`DermFoundationBackbone` — wrapper for Google's gated
  ``google/derm-foundation`` dermatology image encoder on Hugging Face
  (448x448 PNG in, 6144-dim embedding out). It is double-gated and NEVER
  auto-downloads: both the owner-supplied ``HF_TOKEN`` environment variable
  and an explicit terms-acceptance flag
  (``ACNETREX_ACCEPT_DERM_FOUNDATION_TERMS=1`` or ``accept_terms=True``)
  must be present before any network or filesystem model access is
  attempted. Even then, ``production_approved`` stays ``False``: the Health
  AI Developer Foundations terms and the repository's data-rights review
  (docs/ml-research/rejected-resources.md) have not cleared any pretrained
  weights for production, and the training gate remains authoritative.
* :class:`DeterministicDemoBackbone` — a seeded synthetic embedder for
  pipeline validation ONLY (``demo_only = True``). It fabricates vectors
  from a documented deterministic scheme; it has no clinical meaning and
  its outputs must never be presented as model performance on real data.

All heavy imports (numpy, huggingface_hub, tensorflow) are lazy/guarded so
that the FastAPI service and its test suite run without them installed.
"""

from __future__ import annotations

import hashlib
import os
import struct
from collections.abc import Sequence
from pathlib import Path
from typing import Any, Protocol, runtime_checkable

from acnetrex_ml.pipeline._deps import optional_import, require


np = optional_import("numpy")

DERM_FOUNDATION_REPO_ID = "google/derm-foundation"
DERM_FOUNDATION_EMBEDDING_DIM = 6144
DERM_FOUNDATION_INPUT_SIZE = 448
DERM_FOUNDATION_TERMS_ENV = "ACNETREX_ACCEPT_DERM_FOUNDATION_TERMS"
HF_TOKEN_ENV = "HF_TOKEN"

DEMO_ONLY_MARKER = "demo_only"


class BackboneUnavailable(RuntimeError):
    """Raised when a backbone's gates or dependencies are not satisfied."""

    def __init__(self, reasons: Sequence[str]) -> None:
        self.reasons = list(reasons)
        super().__init__("backbone_unavailable:" + ",".join(self.reasons))


@runtime_checkable
class EmbeddingBackbone(Protocol):
    """Minimal contract every embedding backbone must satisfy."""

    name: str
    embedding_dim: int
    demo_only: bool
    production_approved: bool

    def embed_batch(self, image_refs: Sequence[str]) -> Any:
        """Return a float array of shape (len(image_refs), embedding_dim)."""
        ...


def _png_dimensions(data: bytes) -> tuple[int, int]:
    """Parse (width, height) from a PNG header without external deps."""
    signature = b"\x89PNG\r\n\x1a\n"
    if len(data) < 24 or not data.startswith(signature) or data[12:16] != b"IHDR":
        raise ValueError("not_a_png")
    width, height = struct.unpack(">II", data[16:24])
    return int(width), int(height)


class DermFoundationBackbone:
    """Gated wrapper for the ``google/derm-foundation`` image encoder.

    The wrapper is intentionally inert by default. ``ensure_available``
    (called by :meth:`download` and :meth:`embed_batch`) refuses to do
    anything unless ALL of the following hold:

    1. ``huggingface_hub`` is installed (requirements-pipeline.txt extra);
    2. the ``HF_TOKEN`` environment variable is set by the owner — the token
       is read from the environment only and never hardcoded or logged;
    3. the Health AI Developer Foundations terms have been explicitly
       accepted for this run via ``accept_terms=True`` or
       ``ACNETREX_ACCEPT_DERM_FOUNDATION_TERMS=1``.

    Inference additionally needs ``tensorflow`` (the upstream artifact is a
    TF SavedModel). This wrapper has not been exercised against the live
    gated weights inside this repository (no token or terms acceptance is
    present here); it exists so the pipeline is ready once access and legal
    review are granted. ``production_approved`` is ``False`` and stays
    ``False`` until the training/promotion gates pass.
    """

    name = "derm-foundation"
    embedding_dim = DERM_FOUNDATION_EMBEDDING_DIM
    input_size = DERM_FOUNDATION_INPUT_SIZE
    demo_only = False
    production_approved = False

    @property
    def fingerprint(self) -> str:
        return f"{self.name}:{DERM_FOUNDATION_REPO_ID}:dim={self.embedding_dim}"

    def __init__(
        self,
        *,
        accept_terms: bool = False,
        cache_dir: str | Path | None = None,
    ) -> None:
        self._accept_terms = accept_terms
        self._cache_dir = Path(cache_dir) if cache_dir is not None else None
        self._model: Any = None

    def _terms_accepted(self) -> bool:
        return self._accept_terms or os.environ.get(
            DERM_FOUNDATION_TERMS_ENV, ""
        ).strip() in {"1", "true", "yes"}

    def availability(self) -> dict[str, Any]:
        """Report gate status without touching the network."""
        reasons: list[str] = []
        if optional_import("huggingface_hub") is None:
            reasons.append("huggingface_hub_not_installed")
        if not os.environ.get(HF_TOKEN_ENV, "").strip():
            reasons.append("hf_token_missing")
        if not self._terms_accepted():
            reasons.append("derm_foundation_terms_not_accepted")
        return {"available": not reasons, "reasons": reasons}

    def ensure_available(self) -> None:
        status = self.availability()
        if not status["available"]:
            raise BackboneUnavailable(status["reasons"])

    def download(self) -> Path:
        """Download the gated snapshot. Refuses unless every gate passes."""
        self.ensure_available()
        hub = require("huggingface_hub", feature="derm-foundation download")
        local_dir = hub.snapshot_download(
            repo_id=DERM_FOUNDATION_REPO_ID,
            cache_dir=str(self._cache_dir) if self._cache_dir else None,
        )
        return Path(local_dir)

    def _load_model(self) -> Any:
        if self._model is None:
            tf = optional_import("tensorflow")
            if tf is None:
                raise BackboneUnavailable(["tensorflow_not_installed"])
            self._model = tf.saved_model.load(str(self.download()))
        return self._model

    def embed_png_bytes(self, png_bytes: bytes) -> Any:
        """Embed one 448x448 PNG image into a 6144-dim vector."""
        self.ensure_available()
        numpy = require("numpy", feature="derm-foundation embedding")
        width, height = _png_dimensions(png_bytes)
        if (width, height) != (self.input_size, self.input_size):
            raise ValueError(
                f"derm-foundation expects {self.input_size}x{self.input_size} PNG, "
                f"got {width}x{height}"
            )
        tf = optional_import("tensorflow")
        if tf is None:
            raise BackboneUnavailable(["tensorflow_not_installed"])
        model = self._load_model()
        example = tf.train.Example(
            features=tf.train.Features(
                feature={
                    "image/encoded": tf.train.Feature(
                        bytes_list=tf.train.BytesList(value=[png_bytes])
                    )
                }
            )
        ).SerializeToString()
        infer = model.signatures["serving_default"]
        outputs = infer(inputs=tf.constant([example]))
        vector = numpy.asarray(outputs["embedding"])[0]
        if vector.shape != (self.embedding_dim,):
            raise RuntimeError(
                f"unexpected embedding shape {vector.shape}; "
                f"expected ({self.embedding_dim},)"
            )
        return vector.astype("float32")

    def embed_batch(self, image_refs: Sequence[str]) -> Any:
        """Embed local PNG files referenced by filesystem paths."""
        self.ensure_available()
        numpy = require("numpy", feature="derm-foundation embedding")
        rows = [self.embed_png_bytes(Path(ref).read_bytes()) for ref in image_refs]
        return numpy.stack(rows) if rows else numpy.zeros((0, self.embedding_dim))


def _hash_seed(*parts: str) -> int:
    digest = hashlib.sha256(":".join(parts).encode("utf-8")).digest()
    return int.from_bytes(digest[:8], "big")


class DeterministicDemoBackbone:
    """Seeded synthetic embedder for pipeline validation ONLY. Non-clinical.

    ``demo_only = True``: every artifact this backbone touches must carry a
    ``demo_only`` marker, and no output may be described as performance on
    real data. Vectors are fabricated deterministically from the reference
    string of each synthetic sample:

    ``vector = class_signal * prototype[class_index]
             + group_signal * group_vector(group_id)
             + noise_scale * ref_noise(ref)``

    where prototypes are drawn once from ``default_rng(seed)`` and the group
    and per-reference components are seeded via SHA-256 of the identifiers.
    The class-dependent component exists purely so the scaffold's training,
    calibration, splitting, and abstention mechanics can be exercised
    end-to-end on CPU in seconds; the default signal strengths are chosen to
    make the synthetic task deliberately imperfect (so abstention and
    calibration paths are non-trivial). The resulting metrics describe
    pipeline mechanics on synthetic data, never clinical capability.
    """

    demo_only = True
    production_approved = False

    REF_PREFIX = "demo://synthetic"

    def __init__(
        self,
        *,
        embedding_dim: int = 64,
        n_classes: int = 3,
        seed: int = 1234,
        class_signal: float = 0.5,
        group_signal: float = 1.0,
        noise_scale: float = 1.0,
    ) -> None:
        numpy = require("numpy", feature="deterministic demo backbone")
        self.name = f"deterministic-demo-seed{seed}"
        self.embedding_dim = embedding_dim
        self.n_classes = n_classes
        self.seed = seed
        self.class_signal = class_signal
        self.group_signal = group_signal
        self.noise_scale = noise_scale
        rng = numpy.random.default_rng(seed)
        self._prototypes = rng.normal(size=(n_classes, embedding_dim))

    @property
    def fingerprint(self) -> str:
        return (
            f"{self.name}:dim={self.embedding_dim}:classes={self.n_classes}:"
            f"cs={self.class_signal}:gs={self.group_signal}:ns={self.noise_scale}"
        )

    @classmethod
    def make_ref(cls, group_id: str, sample_id: str, class_index: int) -> str:
        return f"{cls.REF_PREFIX}/{group_id}/{sample_id}?class={class_index}"

    @classmethod
    def parse_ref(cls, ref: str) -> tuple[str, str, int]:
        if not ref.startswith(cls.REF_PREFIX + "/"):
            raise ValueError(f"not_a_demo_ref:{ref}")
        remainder = ref[len(cls.REF_PREFIX) + 1 :]
        path, _, query = remainder.partition("?class=")
        group_id, _, sample_id = path.partition("/")
        if not group_id or not sample_id or not query:
            raise ValueError(f"not_a_demo_ref:{ref}")
        return group_id, sample_id, int(query)

    def _group_vector(self, group_id: str) -> Any:
        numpy = require("numpy", feature="deterministic demo backbone")
        rng = numpy.random.default_rng(_hash_seed(str(self.seed), "group", group_id))
        return rng.normal(size=self.embedding_dim)

    def embed_ref(self, ref: str) -> Any:
        numpy = require("numpy", feature="deterministic demo backbone")
        group_id, _sample_id, class_index = self.parse_ref(ref)
        if not 0 <= class_index < self.n_classes:
            raise ValueError(f"demo_class_out_of_range:{class_index}")
        noise_rng = numpy.random.default_rng(_hash_seed(str(self.seed), "ref", ref))
        vector = (
            self.class_signal * self._prototypes[class_index]
            + self.group_signal * self._group_vector(group_id)
            + self.noise_scale * noise_rng.normal(size=self.embedding_dim)
        )
        return vector.astype("float64")

    def embed_batch(self, image_refs: Sequence[str]) -> Any:
        numpy = require("numpy", feature="deterministic demo backbone")
        if not image_refs:
            return numpy.zeros((0, self.embedding_dim))
        return numpy.stack([self.embed_ref(ref) for ref in image_refs])
