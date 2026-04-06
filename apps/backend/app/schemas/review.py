"""
复习模块数据模型。
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class ReviewItem(BaseModel):
    """复习条目。"""

    schedule_id: int = Field(..., description="复习计划 ID")
    article_id: int = Field(..., description="文章 ID")
    title: str = Field(..., description="文章标题")
    level: int = Field(..., description="难度等级")
    stage: int = Field(..., description="当前阶段")
    stage_label: str = Field(..., description="阶段标签")
    days_until_next: int = Field(..., description="距离下次复习的天数")
    next_review_date: datetime = Field(..., description="下次复习时间")
    source_book: int | None = Field(None, description="来源册数")
    source_lesson: int | None = Field(None, description="来源课次")
    last_reviewed_at: datetime | None = Field(None, description="上次复习时间")

    model_config = {"from_attributes": True}


class ReviewListResponse(BaseModel):
    """复习列表响应。"""

    items: list[ReviewItem] = Field(default_factory=list)
    total: int = Field(..., description="总数")


class TodayReviewSummary(BaseModel):
    """今日复习摘要。"""

    has_reviews: bool = Field(..., description="今天是否有复习任务")
    count: int = Field(..., description="今日复习数量")
    message: str = Field(..., description="提示信息")


class ReviewStats(BaseModel):
    """复习统计。"""

    total_schedules: int = Field(..., description="总复习计划数")
    completed_schedules: int = Field(..., description="已完成复习计划数")
    today_pending: int = Field(..., description="今日待复习数")
    streak_days: int = Field(..., description="连续复习天数")
    weekly_completed: int = Field(..., description="本周已完成复习数")
    weekly_total: int = Field(..., description="本周新增复习数")


class SubmitReviewRequest(BaseModel):
    """提交复习请求。"""

    quality_assessment: str = Field(..., description="复习后自评")
    is_quick_mode: bool = Field(default=False, description="是否快速复习")
    duration_seconds: int | None = Field(None, description="复习耗时秒数")
    correct_count: int | None = Field(None, description="答对数")
    total_count: int | None = Field(None, description="总题数")
    preview_assessment: str | None = Field(None, description="复习前自评")


class SubmitReviewResponse(BaseModel):
    """提交复习响应。"""

    success: bool = Field(..., description="是否成功")
    completed: bool = Field(..., description="是否已完成全部复习")
    next_stage: int = Field(..., description="下一阶段")
    next_review_date: datetime | None = Field(None, description="下次复习时间")
    message: str = Field(..., description="提示信息")


class ReviewLogItem(BaseModel):
    """复习日志项。"""

    id: int
    stage: int
    is_quick_mode: bool
    preview_assessment: str | None
    quality_assessment: str | None
    correct_count: int | None
    total_count: int | None
    reviewed_at: datetime

    model_config = {"from_attributes": True}


class ReviewLogListResponse(BaseModel):
    """复习日志列表响应。"""

    logs: list[ReviewLogItem] = Field(default_factory=list)
    total: int


class ArticleReviewStatus(BaseModel):
    """文章复习状态。"""

    is_in_review: bool = Field(..., description="是否处于复习计划中")
    schedule_id: int | None = Field(None, description="复习计划 ID")
    current_stage: int | None = Field(None, description="当前阶段")
    total_stages: int = Field(7, description="总阶段数")
    next_review_date: datetime | None = Field(None, description="下次复习时间")
    completed: bool = Field(..., description="是否已完成全部复习")
