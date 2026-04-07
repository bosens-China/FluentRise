"""
FluentRise 后端应用入口。
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import api_router
from app.core.config import settings
from app.core.exceptions import AppError
from app.core.rate_limit import init_rate_limiters
from app.db.database import check_db_connection, close_db_connection
from app.db.redis import check_redis_connection, close_redis, get_redis, init_redis
from app.services.system_config_service import system_config_service


class ConsoleStyle:
    """控制台日志颜色。"""

    reset = "\033[0m"
    bold = "\033[1m"
    cyan = "\033[96m"
    green = "\033[92m"
    yellow = "\033[93m"
    magenta = "\033[95m"


def console_banner(label: str, message: str, color: str) -> None:
    """打印带颜色的启动日志。"""
    print(f"{ConsoleStyle.bold}{color}{label}{ConsoleStyle.reset} {message}")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """应用生命周期管理。"""
    del app

    console_banner("[START]", "正在初始化应用...", ConsoleStyle.cyan)

    await init_redis()
    console_banner("[REDIS]", "Redis 连接成功", ConsoleStyle.magenta)

    await init_rate_limiters(await get_redis())
    console_banner("[LIMIT]", "限流器初始化完成", ConsoleStyle.yellow)

    await check_db_connection()
    console_banner("[DB]", "数据库连接检查完成", ConsoleStyle.magenta)

    for line in system_config_service.build_startup_lines():
        console_banner("[CFG]", line, ConsoleStyle.cyan)

    console_banner("[OK]", f"{settings.APP_NAME} 启动成功", ConsoleStyle.green)
    if settings.ENABLE_DOCS:
        console_banner("[DOCS]", "API 文档: http://localhost:8000/docs", ConsoleStyle.cyan)

    yield

    console_banner("[STOP]", "正在关闭应用...", ConsoleStyle.yellow)
    await close_redis()
    await close_db_connection()
    console_banner("[OK]", "应用已安全关闭", ConsoleStyle.green)


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="FluentRise 学习平台后端 API",
    docs_url="/docs" if settings.ENABLE_DOCS else None,
    redoc_url="/redoc" if settings.ENABLE_DOCS else None,
    openapi_url="/openapi.json" if settings.ENABLE_OPENAPI else None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppError)
async def handle_app_error(_request: Request, exc: AppError) -> JSONResponse:
    """统一处理业务异常。"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers,
    )


@app.get("/", tags=["健康检查"])
async def root() -> dict[str, str | bool]:
    """根路径健康检查。"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "environment": settings.ENVIRONMENT,
        "docs_enabled": bool(settings.ENABLE_DOCS),
    }


@app.get("/health/live", tags=["健康检查"])
async def live_check() -> dict[str, str]:
    """存活检查端点。"""
    return {"status": "alive"}


@app.get("/health", tags=["健康检查"], response_model=None)
async def health_check() -> JSONResponse | dict[str, object]:
    """就绪检查端点。"""
    checks: dict[str, str] = {}
    errors: dict[str, str] = {}

    try:
        await check_db_connection()
        checks["database"] = "ok"
    except Exception as exc:
        checks["database"] = "error"
        errors["database"] = str(exc) or exc.__class__.__name__

    try:
        await check_redis_connection()
        checks["redis"] = "ok"
    except Exception as exc:
        checks["redis"] = "error"
        errors["redis"] = str(exc) or exc.__class__.__name__

    payload: dict[str, object] = {
        "status": "healthy" if not errors else "unhealthy",
        "checks": checks,
    }
    if errors:
        payload["errors"] = errors
        return JSONResponse(status_code=503, content=payload)
    return payload


app.include_router(api_router, prefix="/api")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )
