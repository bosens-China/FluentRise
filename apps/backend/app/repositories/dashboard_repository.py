"""
首页概览仓储层。
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.article import Article
from app.models.mistake_book import MistakeBookEntry
from app.models.review_schedule import REVIEW_COMPLETED_STAGE, ReviewSchedule
from app.models.vocabulary import Vocabulary


async def count_completed_lessons(db: AsyncSession, *, user_id: int) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(Article)
        .where(Article.user_id == user_id)
        .where(Article.is_completed.is_(True))
    )
    return int(result.scalar_one())


async def count_user_vocabulary_total(db: AsyncSession, *, user_id: int) -> int:
    result = await db.execute(
        select(func.count()).select_from(Vocabulary).where(Vocabulary.user_id == user_id)
    )
    return int(result.scalar_one())


async def count_pending_reviews(
    db: AsyncSession,
    *,
    user_id: int,
    deadline: datetime,
) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(ReviewSchedule)
        .where(ReviewSchedule.user_id == user_id)
        .where(ReviewSchedule.current_stage < REVIEW_COMPLETED_STAGE)
        .where(ReviewSchedule.next_review_date <= deadline)
    )
    return int(result.scalar_one())


async def count_pending_mistakes(db: AsyncSession, *, user_id: int) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(MistakeBookEntry)
        .where(MistakeBookEntry.user_id == user_id)
        .where(MistakeBookEntry.is_mastered.is_(False))
    )
    return int(result.scalar_one())
