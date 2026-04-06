ARG UV_IMAGE=ghcr.io/astral-sh/uv:0.10.5

FROM ${UV_IMAGE} AS uv-bin

FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY --from=uv-bin /uv /bin/uv

WORKDIR /app

COPY pyproject.toml uv.lock ./
COPY apps/backend/pyproject.toml ./apps/backend/

ENV UV_PROJECT_ENVIRONMENT=/opt/venv

RUN uv sync --package fluentrise-backend --no-install-project --no-dev --locked

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1 \
    PATH="/opt/venv/bin:$PATH" \
    PORT=8000 \
    TZ=Asia/Shanghai \
    DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    tzdata \
    && ln -snf /usr/share/zoneinfo/$TZ /etc/localtime \
    && echo $TZ > /etc/timezone \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -r appgroup && useradd -r -g appgroup appuser

COPY --from=builder /opt/venv /opt/venv

WORKDIR /app

COPY --chown=appuser:appgroup apps/backend/app/ ./app/

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
