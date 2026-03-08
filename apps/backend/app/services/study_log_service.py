"""
学习打卡服务
"""

import datetime

from sqlalchemy import extract, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.study_log import StudyLog
from app.schemas.study_log import StudyLogMonthResponse, StudyLogStreakResponse


class StudyLogService:
    @staticmethod
    async def check_in(db: AsyncSession, user_id: int, course_title: str | None = None) -> bool:
        """
        今日打卡
        返回 True 表示打卡成功，返回 False 表示今天已经打过卡了
        """
        today = datetime.date.today()

        # 检查今天是否已打卡
        stmt = select(StudyLog).where(StudyLog.user_id == user_id, StudyLog.date == today)
        result = await db.execute(stmt)
        existing_log = result.scalars().first()

        if existing_log:
            # 如果已经打卡，我们可以更新课程名称（如果传了新的而且之前没有）
            if course_title and not existing_log.course_title:
                existing_log.course_title = course_title
                await db.commit()
            return False

        # 创建新的打卡记录
        new_log = StudyLog(user_id=user_id, date=today, course_title=course_title)
        db.add(new_log)

        try:
            await db.commit()
            return True
        except IntegrityError:
            # 捕获并发导致的唯一约束冲突
            await db.rollback()
            return False

    @staticmethod
    async def get_streak(db: AsyncSession, user_id: int) -> StudyLogStreakResponse:
        """
        获取当前连胜天数和今日打卡状态
        """
        today = datetime.date.today()

        # 获取用户的所有打卡记录，按日期降序排列
        stmt = (
            select(StudyLog.date).where(StudyLog.user_id == user_id).order_by(StudyLog.date.desc())
        )

        result = await db.execute(stmt)
        dates = result.scalars().all()

        if not dates:
            return StudyLogStreakResponse(streak_days=0, today_checked_in=False)

        today_checked_in = dates[0] == today
        streak = 0

        # 计算连胜
        current_check_date = today if today_checked_in else today - datetime.timedelta(days=1)

        for d in dates:
            if d == current_check_date:
                streak += 1
                current_check_date -= datetime.timedelta(days=1)
            elif d > current_check_date:
                # 理论上不会出现，因为降序排列且每天只有一条记录
                continue
            else:
                # 断签了
                break

        return StudyLogStreakResponse(streak_days=streak, today_checked_in=today_checked_in)

    @staticmethod
    async def get_month_logs(
        db: AsyncSession, user_id: int, year: int, month: int
    ) -> StudyLogMonthResponse:
        """
        获取指定月份的所有打卡日期
        """
        stmt = select(StudyLog).where(
            StudyLog.user_id == user_id,
            extract("year", StudyLog.date) == year,
            extract("month", StudyLog.date) == month,
        )

        result = await db.execute(stmt)
        logs = result.scalars().all()

        from app.schemas.study_log import StudyLogMonthItem

        items = [StudyLogMonthItem(date=log.date, course_title=log.course_title) for log in logs]

        return StudyLogMonthResponse(checked_in_dates=items)


study_log_service = StudyLogService()
