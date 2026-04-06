"""
错题本仓储层。
"""

from __future__ import annotations

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mistake_book import MistakeBookEntry


async def get_user_mistake_entry(
    db: AsyncSession,
    *,
    user_id: int,
    item_type: str,
    target_text: str,
) -> MistakeBookEntry | None:
    result = await db.execute(
        select(MistakeBookEntry).where(
            MistakeBookEntry.user_id == user_id,
            MistakeBookEntry.item_type == item_type,
            MistakeBookEntry.target_text == target_text,
        )
    )
    return result.scalar_one_or_none()


async def list_user_mistake_entries(
    db: AsyncSession,
    *,
    user_id: int,
) -> list[MistakeBookEntry]:
    result = await db.execute(
        select(MistakeBookEntry)
        .where(MistakeBookEntry.user_id == user_id)
        .order_by(
            MistakeBookEntry.is_mastered.asc(),
            desc(MistakeBookEntry.last_seen_at),
            desc(MistakeBookEntry.mistake_count),
        )
    )
    return list(result.scalars().all())


async def list_recent_unmastered_mistakes(
    db: AsyncSession,
    *,
    user_id: int,
    item_types: list[str],
    limit: int,
) -> list[MistakeBookEntry]:
    result = await db.execute(
        select(MistakeBookEntry)
        .where(MistakeBookEntry.user_id == user_id)
        .where(MistakeBookEntry.item_type.in_(item_types))
        .where(MistakeBookEntry.is_mastered.is_(False))
        .order_by(desc(MistakeBookEntry.last_seen_at), desc(MistakeBookEntry.mistake_count))
        .limit(limit)
    )
    return list(result.scalars().all())


async def list_recent_unmastered_word_texts(
    db: AsyncSession,
    *,
    user_id: int,
    limit: int,
) -> list[str]:
    result = await db.execute(
        select(MistakeBookEntry.target_text)
        .where(MistakeBookEntry.user_id == user_id)
        .where(MistakeBookEntry.is_mastered.is_(False))
        .where(MistakeBookEntry.item_type == "word")
        .order_by(desc(MistakeBookEntry.last_seen_at))
        .limit(limit)
    )
    return list(result.scalars().all())
