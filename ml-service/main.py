"""Compatibility entrypoint for the canonical package-structured ML service."""

from acnetrex_ml.service.app import app, create_app

__all__ = ["app", "create_app"]
