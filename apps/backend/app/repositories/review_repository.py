"""
复习仓储层。
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import and_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.article import Article
from app.models.review_schedule import ReviewLog, ReviewSchedule


async def get_user_schedule_by_id(
    db: AsyncSession,
    *,
    user_id: int,
    schedule_id: int,
) -> ReviewSchedule | None:
    result = await db.execute(
        select(ReviewSchedule).where(
            and_(
                ReviewSchedule.id == schedule_id,
                ReviewSchedule.user_id == user_id,
            )
        )
    )
    return result.scalar_one_or_none()


async def get_user_schedule_by_article(
    db: AsyncSession,
    *,
    user_id: int,
    article_id: int,
) -> ReviewSchedule | None:
    result = await db.execute(
        select(ReviewSchedule).where(
            ReviewSchedule.user_id == user_id,
            ReviewSchedule.article_id == article_id,
        )
    )
    return result.scalar_one_or_none()


async def list_review_logs_for_schedule(
    db: AsyncSession,
    *,
    schedule_id: int,
) -> list[ReviewLog]:
    result = await db.execute(
        select(ReviewLog)
        .where(ReviewLog.schedule_id == schedule_id)
        .order_by(desc(ReviewLog.reviewed_at))
    )
    return list(result.scalars().all())


async def list_all_review_logs_for_user(
    db: AsyncSession,
    *,
    user_id: int,
) -> list[ReviewLog]:
    result = await db.execute(
        select(ReviewLog)
        .join(ReviewSchedule)
        .where(ReviewSchedule.user_id == user_id)
        .order_by(desc(ReviewLog.reviewed_at))
    )
    return list(result.scalars().all())


async def count_review_schedules(
    db: AsyncSession,
    *,
    user_id: int,
    completed_only: bool = False,
) -> int:
    query = select(func.count()).select_from(ReviewSchedule).where(ReviewSchedule.user_id == user_id)
    if completed_only:
        query = query.where(ReviewSchedule.current_stage >= 8)
    return int((await db.execute(query)).scalar_one())


async def count_due_review_schedules(
    db: AsyncSession,
    *,
    user_id: int,
    today_end: datetime,
) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(ReviewSchedule)
        .where(
            and_(
                ReviewSchedule.user_id == user_id,
                ReviewSchedule.current_stage < 10,
                ReviewSchedule.next_review_date <= today_end,
            )
        )
    )
    return int(result.scalar_one())


async def count_overdue_review_schedules(
    db: AsyncSession,
    *,
    user_id: int,
    today_start: datetime,
    today_end: datetime,
) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(ReviewSchedule)
        .where(
            and_(
                ReviewSchedule.user_id == user_id,
                ReviewSchedule.current_stage < 10,
                ReviewSchedule.next_review_date <= today_end,
                ReviewSchedule.next_review_date < today_start,
            )
        )
    )
    return int(result.scalar_one())


async def list_due_review_items(
    db: AsyncSession,
    *,
    user_id: int,
    today_end: datetime,
) -> list[tuple[ReviewSchedule, Article]]:
    result = await db.execute(
        select(ReviewSchedule, Article)
        .join(Article, ReviewSchedule.article_id == Article.id)
        .where(
            and_(
                ReviewSchedule.user_id == user_id,
                ReviewSchedule.current_stage < 10,
                ReviewSchedule.next_review_date <= today_end,
            )
        )
        .order_by(ReviewSchedule.next_review_date)
    )
    return [(schedule, article) for schedule, article in result.all()]


async def count_weekly_completed_reviews(
    db: AsyncSession,
    *,
    user_id: int,
    week_start: datetime,
) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(ReviewLog)
        .join(ReviewSchedule)
        .where(and_(ReviewSchedule.user_id == user_id, ReviewLog.reviewed_at >= week_start))
    )
    return int(result.scalar_one())


async def count_weekly_new_schedules(
    db: AsyncSession,
    *,
    user_id: int,
    week_start: datetime,
) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(ReviewSchedule)
        .where(
            and_(
                ReviewSchedule.user_id == user_id,
                ReviewSchedule.initial_completed_at >= week_start,
            )
        )
    )
    return int(result.scalar_one())


async def get_article_title_for_schedule(db: AsyncSession, *, article_id: int) -> str | None:
    result = await db.execute(select(Article.title).where(Article.id == article_id))
    return result.scalar_one_or_none()
