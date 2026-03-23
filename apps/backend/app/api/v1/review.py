"""
艾宾浩斯复习系统 API 路由。
"""

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.schemas.review import (
    ArticleReviewStatus,
    ReviewListResponse,
    ReviewLogListResponse,
    ReviewStats,
    SubmitReviewRequest,
    SubmitReviewResponse,
    TodayReviewSummary,
)
from app.schemas.user import UserInfo
from app.services.review_service import review_service

router = APIRouter(prefix="/reviews", tags=["复习"])


@router.get("/today/summary", response_model=TodayReviewSummary)
async def get_today_review_summary(
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """获取今日复习任务摘要。"""
    return await review_service.get_today_review_summary(db, current_user.id)


@router.get("/today/list", response_model=ReviewListResponse)
async def get_today_reviews(
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """获取今日详细复习列表。"""
    return await review_service.get_today_reviews(db, current_user.id)


@router.get("/stats", response_model=ReviewStats)
async def get_review_stats(
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """获取复习统计。"""
    return await review_service.get_review_stats(db, current_user.id)


@router.get("/article/{article_id}/status", response_model=ArticleReviewStatus)
async def get_article_review_status(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """获取文章复习状态。"""
    return await review_service.get_article_review_status(db, current_user.id, article_id)


@router.get("/{schedule_id}/logs", response_model=ReviewLogListResponse)
async def get_review_logs(
    schedule_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """获取某个复习计划的详细日志。"""
    return await review_service.get_review_logs(db, current_user.id, schedule_id)


@router.post("/{schedule_id}/submit", response_model=SubmitReviewResponse)
async def submit_review(
    schedule_id: int,
    request: SubmitReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """提交复习完成结果并推进下一阶段。"""
    return await review_service.submit_review(db, current_user.id, schedule_id, request)
