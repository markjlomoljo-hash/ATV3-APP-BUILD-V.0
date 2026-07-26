"""Guarded imports for optional pipeline dependencies.

The production service (``requirements.txt``) intentionally does not depend
on scikit-learn, numpy, or huggingface_hub. Pipeline modules must therefore
degrade gracefully: importing them never fails, but using functionality that
needs an absent dependency raises :class:`PipelineDependencyError` with a
pointer to ``ml-service/requirements-pipeline.txt``.
"""

from __future__ import annotations

import importlib
from types import ModuleType


PIPELINE_REQUIREMENTS_HINT = (
    "install pipeline extras first: pip install -r ml-service/requirements-pipeline.txt"
)


class PipelineDependencyError(RuntimeError):
    """An optional pipeline dependency is not installed."""

    def __init__(self, module_name: str, feature: str) -> None:
        self.module_name = module_name
        self.feature = feature
        super().__init__(
            f"missing_pipeline_dependency:{module_name} required for {feature}; "
            f"{PIPELINE_REQUIREMENTS_HINT}"
        )


def optional_import(module_name: str) -> ModuleType | None:
    try:
        return importlib.import_module(module_name)
    except ImportError:
        return None


def require(module_name: str, *, feature: str) -> ModuleType:
    module = optional_import(module_name)
    if module is None:
        raise PipelineDependencyError(module_name, feature)
    return module
