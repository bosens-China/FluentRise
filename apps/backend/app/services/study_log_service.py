"""
学习打卡服务。
"""

from __future__ import annotations

from datetime import timedelta

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.time import app_today
from app.models.study_log import StudyLog
from app.repositories.study_log_repository import (
    get_study_log_by_date,
    list_month_study_logs,
    list_study_log_dates_desc,
)
from app.schemas.study_log import StudyLogMonthItem, StudyLogMonthResponse, StudyLogStreakResponse


class StudyLogService:
    """学习打卡服务。"""

    @staticmethod
    async def check_in(db: AsyncSession, user_id: int, course_title: str | None = None) -> bool:
        """
        今日打卡。
        返回 True 表示新建打卡成功，False 表示今天已经打过卡。
        """
        today = app_today()
        existing_log = await get_study_log_by_date(db, user_id=user_id, date=today)

        if existing_log:
            if course_title and not existing_log.course_title:
                existing_log.course_title = course_title
                await db.commit()
            return False

        db.add(StudyLog(user_id=user_id, date=today, course_title=course_title))

        try:
            await db.commit()
            return True
        except IntegrityError:
            await db.rollback()
            return False

    @staticmethod
    async def get_streak(db: AsyncSession, user_id: int) -> StudyLogStreakResponse:
        """获取连续打卡天数与今日状态。"""
        today = app_today()
        dates = await list_study_log_dates_desc(db, user_id=user_id)

        if not dates:
            return StudyLogStreakResponse(streak_days=0, today_checked_in=False)

        today_checked_in = dates[0] == today
        streak = 0
        current_check_date = today if today_checked_in else today - timedelta(days=1)

        for log_date in dates:
            if log_date == current_check_date:
                streak += 1
                current_check_date -= timedelta(days=1)
            elif log_date > current_check_date:
                continue
            else:
                break

        return StudyLogStreakResponse(streak_days=streak, today_checked_in=today_checked_in)

    @staticmethod
    async def get_month_logs(
        db: AsyncSession,
        user_id: int,
        year: int,
        month: int,
    ) -> StudyLogMonthResponse:
        """获取指定月份的打卡记录。"""
        logs = await list_month_study_logs(db, user_id=user_id, year=year, month=month)
        items = [StudyLogMonthItem(date=log.date, course_title=log.course_title) for log in logs]
        return StudyLogMonthResponse(checked_in_dates=items)


study_log_service = StudyLogService()
