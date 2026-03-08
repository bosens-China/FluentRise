"""
学习打卡相关 Pydantic 模式
"""

import datetime

from pydantic import BaseModel, Field


class StudyLogBase(BaseModel):
    """打卡记录基础模型"""

    date: datetime.date = Field(..., description="打卡日期")


class StudyLogCreate(StudyLogBase):
    """创建打卡记录请求（通常不需要参数，由后端取当前日期）"""

    pass


class StudyLogResponse(StudyLogBase):
    """打卡记录响应"""

    id: int
    user_id: int
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class StudyLogStreakResponse(BaseModel):
    """连胜天数响应"""

    streak_days: int = Field(..., description="当前连续打卡天数")
    today_checked_in: bool = Field(..., description="今天是否已打卡")


class StudyLogMonthItem(BaseModel):
    """月度打卡项目"""

    date: datetime.date = Field(..., description="打卡日期")
    course_title: str | None = Field(None, description="课程名称")


class StudyLogMonthResponse(BaseModel):
    """月度打卡记录响应"""

    checked_in_dates: list[StudyLogMonthItem] = Field(
        ..., description="当月已打卡的日期及相关信息列表"
    )
