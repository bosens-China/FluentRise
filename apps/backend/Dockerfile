# Backend Dockerfile - 生产环境
FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

# 安装构建依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 安装 uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

WORKDIR /app

# 复制工作区配置和锁文件（利用缓存）
COPY pyproject.toml uv.lock ./
COPY apps/backend/pyproject.toml ./apps/backend/

# 创建独立虚拟环境并同步依赖（不包含项目代码，加快缓存命中）
ENV UV_PROJECT_ENVIRONMENT=/opt/venv
RUN uv sync --package fluentrise-backend --no-install-project --no-dev

# 生产阶段
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1 \
    PATH="/opt/venv/bin:$PATH" \
    PORT=8000 \
    TZ=Asia/Shanghai \
    DEBIAN_FRONTEND=noninteractive

# 安装运行时依赖和时区数据
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    tzdata \
    && ln -snf /usr/share/zoneinfo/$TZ /etc/localtime \
    && echo $TZ > /etc/timezone \
    && rm -rf /var/lib/apt/lists/*

# 创建非 root 用户
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# 复制虚拟环境（包含了所有依赖）
COPY --from=builder /opt/venv /opt/venv

WORKDIR /app

# 只复制应用所需的代码，使用原来预期的目录结构 (app/)
COPY --chown=appuser:appgroup apps/backend/app/ ./app/

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
