"""
学习打卡仓储层。
"""

from __future__ import annotations

from sqlalchemy import extract, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.study_log import StudyLog


async def get_study_log_by_date(
    db: AsyncSession,
    *,
    user_id: int,
    date,
) -> StudyLog | None:
    result = await db.execute(
        select(StudyLog).where(StudyLog.user_id == user_id, StudyLog.date == date)
    )
    return result.scalars().first()


async def list_study_log_dates_desc(db: AsyncSession, *, user_id: int) -> list:
    result = await db.execute(
        select(StudyLog.date).where(StudyLog.user_id == user_id).order_by(StudyLog.date.desc())
    )
    return list(result.scalars().all())


async def list_month_study_logs(
    db: AsyncSession,
    *,
    user_id: int,
    year: int,
    month: int,
) -> list[StudyLog]:
    result = await db.execute(
        select(StudyLog).where(
            StudyLog.user_id == user_id,
            extract("year", StudyLog.date) == year,
            extract("month", StudyLog.date) == month,
        )
    )
    return list(result.scalars().all())
