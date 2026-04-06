"""
笔记仓储层。
"""

from __future__ import annotations

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.note import Note


async def get_user_note_by_id(
    db: AsyncSession,
    *,
    user_id: int,
    note_id: int,
) -> Note | None:
    result = await db.execute(select(Note).where(Note.id == note_id, Note.user_id == user_id))
    return result.scalar_one_or_none()


async def count_user_notes(
    db: AsyncSession,
    *,
    user_id: int,
    article_id: int | None,
) -> int:
    query = select(Note).where(Note.user_id == user_id)
    if article_id is not None:
        query = query.where(Note.article_id == article_id)
    count_query = select(func.count()).select_from(query.subquery())
    return int((await db.scalar(count_query)) or 0)


async def list_user_notes(
    db: AsyncSession,
    *,
    user_id: int,
    offset: int,
    limit: int,
    article_id: int | None,
) -> list[Note]:
    query = select(Note).where(Note.user_id == user_id)
    if article_id is not None:
        query = query.where(Note.article_id == article_id)

    result = await db.execute(
        query.options(selectinload(Note.article))
        .order_by(desc(Note.created_at))
        .offset(offset)
        .limit(limit)
    )
    return list(result.scalars().all())
