"""
数据库连接和会话管理
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

# 创建异步引擎
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
    pool_pre_ping=True,
)

# 异步会话工厂
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


# 声明性基类（SQLAlchemy 2.0 风格）
class Base(DeclarativeBase):
    """ORM 基类"""


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """获取数据库会话（依赖注入用）"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    """初始化数据库（创建表）"""
    # 确保所有模型在 create_all 之前被导入
    # 这样 SQLAlchemy 才能识别到它们
    # 这些导入是为了注册模型到 SQLAlchemy 元数据，确保 create_all 能创建表
    from app.models.article import Article  # noqa: F401 # type: ignore
    from app.models.note import Note  # noqa: F401 # type: ignore
    from app.models.user import User  # noqa: F401 # type: ignore
    from app.models.vocabulary import Vocabulary  # noqa: F401 # type: ignore

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db_connection() -> None:
    """关闭数据库连接池"""
    await engine.dispose()
