from typing import Literal

from pydantic import BaseModel, ConfigDict


class ModelManifestEntry(BaseModel):
    model_config = ConfigDict(extra="forbid")
    model_name: str
    model_version: str
    status: Literal[
        "candidate", "validated", "approved", "active", "deprecated", "rejected"
    ]
    task: str
    runtime_targets: list[str]
    artifact_uri: str | None = None
    artifact_hash: str | None = None
    dataset_version: str | None = None
    feature_schema_version: str
    label_schema_version: str | None = None
    training_run_id: str | None = None
    evaluation_report: str
    model_card: str
    created_at: str
    approved_at: str | None = None
    approval_state: str
    limitations: list[str]
