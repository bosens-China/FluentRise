"""
FluentRise 后端主应用入口
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_router
from app.core.config import settings
from app.db.database import close_db_connection, init_db
from app.db.redis import close_redis, init_redis


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    应用生命周期管理
    - 启动时初始化数据库和 Redis
    - 关闭时清理资源
    """
    # 启动
    print("[START] 正在初始化应用...")
    await init_redis()
    await init_db()
    print(f"[OK] {settings.APP_NAME} 启动成功！")
    print("[INFO] API 文档: http://localhost:8000/docs")
    yield
    # 关闭
    print("[STOP] 正在关闭应用...")
    await close_redis()
    await close_db_connection()
    print("[OK] 应用已安全关闭")


# 创建 FastAPI 应用
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="FluentRise 学习平台后端 API",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 根路由
@app.get("/", tags=["健康检查"])
async def root() -> dict[str, str]:
    """根路由 - 服务健康检查"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "environment": settings.ENVIRONMENT,
    }


@app.get("/health", tags=["健康检查"])
async def health_check() -> dict[str, str]:
    """健康检查端点"""
    return {"status": "healthy"}


# 注册 API 路由
app.include_router(api_router, prefix="/api")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
    )
