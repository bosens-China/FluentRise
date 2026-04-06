"""
学习打卡相关数据模型。
"""

from __future__ import annotations

import datetime

from pydantic import BaseModel, Field


class StudyLogStreakResponse(BaseModel):
    """连续打卡响应。"""

    streak_days: int = Field(..., description="连续打卡天数")
    today_checked_in: bool = Field(..., description="今天是否已打卡")


class StudyLogMonthItem(BaseModel):
    """月度打卡项。"""

    date: datetime.date = Field(..., description="打卡日期")
    course_title: str | None = Field(None, description="课程标题")


class StudyLogMonthResponse(BaseModel):
    """月度打卡列表响应。"""

    checked_in_dates: list[StudyLogMonthItem] = Field(..., description="当月打卡日期列表")
