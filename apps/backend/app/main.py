"""
FluentRise 后端主应用入口。
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_router
from app.core.config import settings
from app.core.rate_limit import init_rate_limiters
from app.db.database import close_db_connection, init_db
from app.db.redis import close_redis, get_redis, init_redis


class ConsoleStyle:
    """控制台颜色样式。"""

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
    """
    应用生命周期管理。

    启动时初始化 Redis、限流器和数据库，关闭时回收资源。
    """
    console_banner("[START]", "正在初始化应用...", ConsoleStyle.cyan)
    await init_redis()
    console_banner("[REDIS]", "Redis 已连接", ConsoleStyle.magenta)

    await init_rate_limiters(await get_redis())
    console_banner("[LIMIT]", "限流器初始化完成", ConsoleStyle.yellow)

    await init_db()
    console_banner("[DB]", "数据库初始化完成", ConsoleStyle.magenta)
    console_banner("[OK]", f"{settings.APP_NAME} 启动成功", ConsoleStyle.green)
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
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["健康检查"])
async def root() -> dict[str, str]:
    """根路由健康检查。"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "environment": settings.ENVIRONMENT,
    }


@app.get("/health", tags=["健康检查"])
async def health_check() -> dict[str, str]:
    """健康检查端点。"""
    return {"status": "healthy"}


app.include_router(api_router, prefix="/api")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )
