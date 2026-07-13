FROM cgr.dev/chainguard/python:latest-dev AS builder

USER root
WORKDIR /build

COPY requirements.txt .
RUN python -m venv /venv \
    && /venv/bin/pip install --no-cache-dir -r requirements.txt

FROM cgr.dev/chainguard/python:latest

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

WORKDIR /app

COPY --from=builder /venv /venv
COPY --chown=nonroot:nonroot acnetrex_ml ./acnetrex_ml
COPY --chown=nonroot:nonroot manifests ./manifests
COPY --chown=nonroot:nonroot reports ./reports
COPY --chown=nonroot:nonroot schemas ./schemas
COPY --chown=nonroot:nonroot main.py .

EXPOSE 8080

ENTRYPOINT ["/venv/bin/python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
