class AcneTrexMLError(Exception):
    """Base safe-domain error."""

    code = "ml_error"
    retryable = False


class InsufficientDataError(AcneTrexMLError):
    code = "insufficient_data"


class ConsentRestrictedError(AcneTrexMLError):
    code = "consent_restricted"


class ModelUnavailableError(AcneTrexMLError):
    code = "model_unavailable"


class VertexUnavailableError(AcneTrexMLError):
    code = "vertex_unavailable"
    retryable = True


class VertexModelMissingError(AcneTrexMLError):
    code = "vertex_model_missing"


class IdempotencyConflictError(AcneTrexMLError):
    code = "idempotency_key_reused_with_different_payload"


class OperationInProgressError(AcneTrexMLError):
    code = "operation_in_progress"
    retryable = True
