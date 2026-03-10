"""
复习模块 Schema
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ReviewStageInfo(BaseModel):
    """复习阶段信息"""
    stage: int = Field(..., description="当前阶段 1-7")
    label: str = Field(..., description="阶段标签，如'第1轮'")
    days_until_next: int = Field(..., description="距离下次复习还有几天")
    next_review_date: datetime = Field(..., description="下次复习日期")


class ReviewItem(BaseModel):
    """复习项目"""
    schedule_id: int = Field(..., description="复习计划ID")
    article_id: int = Field(..., description="文章ID")
    title: str = Field(..., description="文章标题")
    level: int = Field(..., description="文章难度等级")
    stage: int = Field(..., description="当前复习阶段 1-7")
    stage_label: str = Field(..., description="阶段标签")
    days_until_next: int = Field(..., description="距离下次复习还有几天")
    next_review_date: datetime = Field(..., description="下次复习日期")
    source_book: int | None = Field(None, description="来源书籍")
    source_lesson: int | None = Field(None, description="来源课程")
    last_reviewed_at: datetime | None = Field(None, description="上次复习时间")

    model_config = {"from_attributes": True}


class ReviewListResponse(BaseModel):
    """复习列表响应"""
    items: list[ReviewItem] = Field(default_factory=list)
    total: int = Field(..., description="总数")


class TodayReviewSummary(BaseModel):
    """今日复习摘要（用于首页仪表盘）"""
    has_reviews: bool = Field(..., description="是否有今日复习任务")
    count: int = Field(..., description="今日复习数量")
    message: str = Field(..., description="提示消息")


class ReviewStats(BaseModel):
    """复习统计"""
    total_schedules: int = Field(..., description="总复习计划数")
    completed_schedules: int = Field(..., description="已完成数")
    today_pending: int = Field(..., description="今日待复习数")
    streak_days: int = Field(..., description="连续复习天数")
    weekly_completed: int = Field(..., description="本周已完成数")
    weekly_total: int = Field(..., description="本周总复习数")


class PreviewAssessmentRequest(BaseModel):
    """复习前自评请求"""
    preview_assessment: str = Field(
        ...,
        description="复习前自评: clear(清楚), fuzzy(模糊), forgot(完全忘了)"
    )


class SubmitReviewRequest(BaseModel):
    """提交复习请求"""
    quality_assessment: str = Field(
        ...,
        description="复习质量自评: mastered(掌握), fuzzy(模糊), forgot(遗忘)"
    )
    is_quick_mode: bool = Field(default=False, description="是否为快速复习模式")
    duration_seconds: int | None = Field(None, description="复习用时（秒）")
    correct_count: int | None = Field(None, description="练习题正确数")
    total_count: int | None = Field(None, description="练习题总数")
    preview_assessment: str | None = Field(
        None,
        description="复习前自评: clear(清楚), fuzzy(模糊), forgot(完全忘了)"
    )


class SubmitReviewResponse(BaseModel):
    """提交复习响应"""
    success: bool = Field(..., description="是否成功")
    completed: bool = Field(..., description="是否完成全部7轮复习")
    next_stage: int = Field(..., description="下一阶段（8表示已完成）")
    next_review_date: datetime | None = Field(None, description="下次复习日期（None表示已完成）")
    message: str = Field(..., description="提示消息")


class ReviewLogItem(BaseModel):
    """复习日志项"""
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
    """复习日志列表响应"""
    logs: list[ReviewLogItem] = Field(default_factory=list)
    total: int


class ArticleReviewStatus(BaseModel):
    """文章复习状态（用于文章详情页）"""
    is_in_review: bool = Field(..., description="是否处于复习计划")
    schedule_id: int | None = Field(None, description="复习计划ID")
    current_stage: int | None = Field(None, description="当前阶段")
    total_stages: int = Field(7, description="总阶段数")
    next_review_date: datetime | None = Field(None, description="下次复习日期")
    completed: bool = Field(..., description="是否已完成全部复习")
