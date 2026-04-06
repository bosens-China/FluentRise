"""
复习服务辅助方法。
"""

from __future__ import annotations

from datetime import datetime, timedelta

from app.core.time import app_day_bounds, app_timezone, app_today
from app.models.review_schedule import ReviewLog


def get_due_review_deadlines() -> tuple[datetime, datetime]:
    """返回业务时区今天的起止时间。"""
    return app_day_bounds()


def calculate_streak_days(logs: list[ReviewLog]) -> int:
    """计算连续复习天数。"""
    if not logs:
        return 0

    review_dates = sorted(
        {log.reviewed_at.astimezone(app_timezone()).date() for log in logs},
        reverse=True,
    )
    if not review_dates:
        return 0

    today = app_today()
    if review_dates[0] not in {today, today - timedelta(days=1)}:
        return 0

    streak = 1
    for index in range(len(review_dates) - 1):
        if review_dates[index] - review_dates[index + 1] == timedelta(days=1):
            streak += 1
        else:
            break
    return streak


def build_today_review_message(count: int, overdue_count: int) -> str:
    """构建今日复习摘要文案。"""
    if count == 0:
        return "今天没有复习任务，可以继续学习新内容。"
    if overdue_count == 0:
        return f"今天有 {count} 个内容需要复习。"
    if overdue_count == count:
        return f"你有 {count} 个逾期复习任务待完成。"
    return f"今天有 {count} 个待复习内容，其中 {overdue_count} 个已经逾期。"
