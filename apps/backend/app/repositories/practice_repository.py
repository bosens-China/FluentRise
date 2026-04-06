"""
练习场仓储层。
"""

from __future__ import annotations

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.practice_session import PracticeSession


async def count_practice_sessions(db: AsyncSession, *, user_id: int) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(PracticeSession)
        .where(PracticeSession.user_id == user_id)
    )
    return int(result.scalar() or 0)


async def list_practice_sessions(
    db: AsyncSession,
    *,
    user_id: int,
    page: int,
    page_size: int,
) -> list[PracticeSession]:
    result = await db.execute(
        select(PracticeSession)
        .where(PracticeSession.user_id == user_id)
        .order_by(desc(PracticeSession.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return list(result.scalars().all())


async def get_practice_stats_row(db: AsyncSession, *, user_id: int):
    result = await db.execute(
        select(
            func.count().label("total_sessions"),
            func.sum(PracticeSession.total_questions).label("total_questions"),
            func.sum(PracticeSession.correct_count).label("total_correct"),
            func.sum(PracticeSession.wrong_count).label("total_wrong"),
            func.sum(PracticeSession.skipped_count).label("total_skipped"),
            func.sum(PracticeSession.duration_seconds).label("total_duration"),
            func.max(PracticeSession.max_streak).label("best_streak"),
        ).where(PracticeSession.user_id == user_id)
    )
    return result.one_or_none()
