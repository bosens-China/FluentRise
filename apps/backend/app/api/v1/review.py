"""
复习相关路由。
"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.review import (
    ArticleReviewStatus,
    ReviewListResponse,
    ReviewLogListResponse,
    ReviewStats,
    SubmitReviewRequest,
    SubmitReviewResponse,
    TodayReviewSummary,
)
from app.services.review_service import review_service

router = APIRouter(prefix="/reviews", tags=["复习"])


@router.get("/today/summary", response_model=TodayReviewSummary, summary="获取今日复习摘要")
async def get_today_review_summary(
    db: DbSession,
    current_user: CurrentUser,
) -> TodayReviewSummary:
    return await review_service.get_today_review_summary(db, current_user.id)


@router.get("/today/list", response_model=ReviewListResponse, summary="获取今日复习列表")
async def get_today_reviews(
    db: DbSession,
    current_user: CurrentUser,
) -> ReviewListResponse:
    return await review_service.get_today_reviews(db, current_user.id)


@router.get("/stats", response_model=ReviewStats, summary="获取复习统计")
async def get_review_stats(
    db: DbSession,
    current_user: CurrentUser,
) -> ReviewStats:
    return await review_service.get_review_stats(db, current_user.id)


@router.get(
    "/article/{article_id}/status",
    response_model=ArticleReviewStatus,
    summary="获取文章复习状态",
)
async def get_article_review_status(
    article_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> ArticleReviewStatus:
    return await review_service.get_article_review_status(db, current_user.id, article_id)


@router.get("/{schedule_id}/logs", response_model=ReviewLogListResponse, summary="获取复习日志")
async def get_review_logs(
    schedule_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> ReviewLogListResponse:
    return await review_service.get_review_logs(db, current_user.id, schedule_id)


@router.post("/{schedule_id}/submit", response_model=SubmitReviewResponse, summary="提交复习结果")
async def submit_review(
    schedule_id: int,
    request: SubmitReviewRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> SubmitReviewResponse:
    return await review_service.submit_review(db, current_user.id, schedule_id, request)
