from __future__ import annotations

import os
import time
import uuid

from fastapi import HTTPException, Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from acnetrex_ml.observability.metrics import METRICS
from acnetrex_ml.observability.tracing import valid_traceparent


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        maximum = int(os.getenv("MAX_REQUEST_BYTES", "1048576"))
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                declared_length = int(content_length)
            except ValueError as exc:
                raise HTTPException(
                    status_code=400, detail={"code": "invalid_content_length"}
                ) from exc
            if declared_length < 0:
                raise HTTPException(
                    status_code=400, detail={"code": "invalid_content_length"}
                )
            if declared_length > maximum:
                raise HTTPException(
                    status_code=413, detail={"code": "request_too_large"}
                )
        supplied_request_id = request.headers.get("X-Request-ID")
        try:
            request_id = (
                str(uuid.UUID(supplied_request_id))
                if supplied_request_id
                else str(uuid.uuid4())
            )
        except ValueError:
            request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        request.state.traceparent = valid_traceparent(
            request.headers.get("traceparent")
        )
        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            METRICS.increment("http_exception")
            raise
        METRICS.increment(f"http_status_{response.status_code // 100}xx")
        METRICS.observe_latency(request.url.path, (time.perf_counter() - start) * 1000)
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Cache-Control"] = "no-store"
        if request.state.traceparent:
            response.headers["traceparent"] = request.state.traceparent
        return response
