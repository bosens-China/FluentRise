"""
文章相关仓储层。
"""

from __future__ import annotations

from datetime import date

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.article import Article


async def get_user_article_by_id(
    db: AsyncSession,
    *,
    user_id: int,
    article_id: int,
) -> Article | None:
    result = await db.execute(
        select(Article).where(Article.id == article_id, Article.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def get_user_article_by_publish_date(
    db: AsyncSession,
    *,
    user_id: int,
    publish_date: date,
) -> Article | None:
    result = await db.execute(
        select(Article).where(Article.user_id == user_id, Article.publish_date == publish_date)
    )
    return result.scalar_one_or_none()


async def count_user_articles(db: AsyncSession, *, user_id: int) -> int:
    result = await db.execute(select(func.count()).select_from(Article).where(Article.user_id == user_id))
    return int(result.scalar_one())


async def list_user_article_history(
    db: AsyncSession,
    *,
    user_id: int,
    offset: int,
    limit: int,
) -> list[Article]:
    result = await db.execute(
        select(Article)
        .where(Article.user_id == user_id)
        .order_by(desc(Article.publish_date), desc(Article.created_at))
        .offset(offset)
        .limit(limit)
    )
    return list(result.scalars().all())


async def list_recent_completed_articles(
    db: AsyncSession,
    *,
    user_id: int,
    limit: int = 10,
) -> list[Article]:
    result = await db.execute(
        select(Article)
        .where(Article.user_id == user_id, Article.is_completed.is_(True))
        .order_by(desc(Article.completed_at), desc(Article.id))
        .limit(limit)
    )
    return list(result.scalars().all())


async def list_recent_user_articles(
    db: AsyncSession,
    *,
    user_id: int,
    limit: int,
) -> list[Article]:
    result = await db.execute(
        select(Article)
        .where(Article.user_id == user_id)
        .order_by(desc(Article.publish_date), desc(Article.created_at))
        .limit(limit)
    )
    return list(result.scalars().all())


async def list_recent_user_articles_before_date(
    db: AsyncSession,
    *,
    user_id: int,
    target_date: date,
    limit: int,
) -> list[Article]:
    result = await db.execute(
        select(Article)
        .where(Article.user_id == user_id)
        .where(Article.publish_date <= target_date)
        .order_by(desc(Article.publish_date), desc(Article.created_at))
        .limit(limit)
    )
    return list(result.scalars().all())


async def list_article_titles_for_user(db: AsyncSession, *, user_id: int) -> list[str]:
    result = await db.execute(select(Article.title).where(Article.user_id == user_id))
    return list(result.scalars().all())
