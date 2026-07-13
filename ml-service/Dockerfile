FROM python:3.11-slim-bookworm AS builder

WORKDIR /build

COPY requirements.txt .
RUN pip install --no-cache-dir --target=/packages -r requirements.txt

FROM gcr.io/distroless/python3-debian12:nonroot

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/packages \
    PORT=8080

WORKDIR /app

COPY --from=builder /packages /packages
COPY --chown=nonroot:nonroot acnetrex_ml ./acnetrex_ml
COPY --chown=nonroot:nonroot manifests ./manifests
COPY --chown=nonroot:nonroot reports ./reports
COPY --chown=nonroot:nonroot schemas ./schemas
COPY --chown=nonroot:nonroot main.py .

USER nonroot

EXPOSE 8080

ENTRYPOINT ["/usr/bin/python3"]
CMD ["-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
