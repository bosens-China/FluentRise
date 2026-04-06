"""
词汇仓储层。
"""

from __future__ import annotations

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.vocabulary import Vocabulary


async def count_user_vocabulary(db: AsyncSession, *, user_id: int) -> int:
    result = await db.execute(
        select(func.count()).select_from(Vocabulary).where(Vocabulary.user_id == user_id)
    )
    return int(result.scalar_one())


async def list_user_vocabulary_words(db: AsyncSession, *, user_id: int) -> list[str]:
    result = await db.execute(
        select(Vocabulary.word)
        .where(Vocabulary.user_id == user_id)
        .order_by(desc(Vocabulary.created_at))
    )
    return [row[0] for row in result.all()]


async def list_user_vocabulary_entries(
    db: AsyncSession,
    *,
    user_id: int,
    limit: int | None = None,
) -> list[Vocabulary]:
    query = (
        select(Vocabulary)
        .where(Vocabulary.user_id == user_id)
        .order_by(desc(Vocabulary.created_at))
    )
    if limit is not None:
        query = query.limit(limit)

    result = await db.execute(query)
    return list(result.scalars().all())


async def list_user_vocabulary_entries_with_article(
    db: AsyncSession,
    *,
    user_id: int,
) -> list[Vocabulary]:
    result = await db.execute(
        select(Vocabulary)
        .options(selectinload(Vocabulary.article))
        .where(Vocabulary.user_id == user_id)
        .order_by(desc(Vocabulary.created_at), desc(Vocabulary.id))
    )
    return list(result.scalars().all())
