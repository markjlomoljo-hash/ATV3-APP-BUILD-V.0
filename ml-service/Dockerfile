FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN groupadd --system acnetrex && useradd --system --gid acnetrex --home-dir /app acnetrex

COPY acnetrex_ml ./acnetrex_ml
COPY manifests ./manifests
COPY reports ./reports
COPY schemas ./schemas
COPY main.py .

RUN chown -R acnetrex:acnetrex /app
USER acnetrex

EXPOSE 8080

CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
