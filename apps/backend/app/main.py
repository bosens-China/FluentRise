"""
FluentRise 后端主应用入口。
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_router
from app.core.config import settings
from app.core.rate_limit import init_rate_limiters
from app.db.database import close_db_connection, init_db
from app.db.redis import close_redis, get_redis, init_redis


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    应用生命周期管理。
    启动时初始化 Redis、限流器和数据库，关闭时回收资源。
    """
    print("[START] 正在初始化应用...")
    await init_redis()
    await init_rate_limiters(await get_redis())
    await init_db()
    print(f"[OK] {settings.APP_NAME} 启动成功！")
    print("[INFO] API 文档: http://localhost:8000/docs")
    yield
    print("[STOP] 正在关闭应用...")
    await close_redis()
    await close_db_connection()
    print("[OK] 应用已安全关闭")


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
