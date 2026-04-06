"""
复习服务。
"""

from __future__ import annotations

from datetime import timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestError, NotFoundError
from app.core.time import app_day_bounds, app_timezone, app_today, utc_now
from app.models.review_schedule import (
    REVIEW_COMPLETED_STAGE,
    REVIEW_TOTAL_STAGES,
    ReviewLog,
    ReviewSchedule,
    get_next_review_date,
)
from app.repositories.review_repository import (
    count_due_review_schedules,
    count_overdue_review_schedules,
    count_review_schedules,
    count_weekly_completed_reviews,
    count_weekly_new_schedules,
    get_article_title_for_schedule,
    get_user_schedule_by_article,
    get_user_schedule_by_id,
    list_all_review_logs_for_user,
    list_due_review_items,
    list_review_logs_for_schedule,
)
from app.schemas.review import (
    ArticleReviewStatus,
    ReviewItem,
    ReviewListResponse,
    ReviewLogItem,
    ReviewLogListResponse,
    ReviewStats,
    SubmitReviewRequest,
    SubmitReviewResponse,
    TodayReviewSummary,
)
from app.services.review_support import (
    build_today_review_message,
    calculate_streak_days,
    get_due_review_deadlines,
)
from app.services.study_log_service import study_log_service


class ReviewService:
    """复习服务。"""

    @staticmethod
    async def create_review_schedule(
        db: AsyncSession,
        user_id: int,
        article_id: int,
    ) -> ReviewSchedule | None:
        existing = await get_user_schedule_by_article(db, user_id=user_id, article_id=article_id)
        if existing:
            return None

        now = utc_now()
        schedule = ReviewSchedule(
            user_id=user_id,
            article_id=article_id,
            current_stage=1,
            next_review_date=get_next_review_date(now, 1),
            initial_completed_at=now,
            last_reviewed_at=None,
        )
        db.add(schedule)
        await db.commit()
        await db.refresh(schedule)
        return schedule

    @staticmethod
    async def get_or_create_schedule(
        db: AsyncSession,
        user_id: int,
        article_id: int,
    ) -> ReviewSchedule | None:
        schedule = await get_user_schedule_by_article(db, user_id=user_id, article_id=article_id)
        if schedule:
            return schedule
        return await ReviewService.create_review_schedule(db, user_id, article_id)

    @staticmethod
    async def has_active_schedule(
        db: AsyncSession,
        user_id: int,
        article_id: int,
    ) -> bool:
        schedule = await get_user_schedule_by_article(db, user_id=user_id, article_id=article_id)
        return schedule is not None and schedule.current_stage < REVIEW_COMPLETED_STAGE

    @staticmethod
    async def get_today_review_summary(db: AsyncSession, user_id: int) -> TodayReviewSummary:
        today_start, today_end = get_due_review_deadlines()
        count = await count_due_review_schedules(db, user_id=user_id, today_end=today_end)

        overdue_count = 0
        if count > 0:
            overdue_count = await count_overdue_review_schedules(
                db,
                user_id=user_id,
                today_start=today_start,
                today_end=today_end,
            )

        return TodayReviewSummary(
            has_reviews=count > 0,
            count=count,
            message=build_today_review_message(count, overdue_count),
        )

    @staticmethod
    async def get_today_reviews(db: AsyncSession, user_id: int) -> ReviewListResponse:
        _, today_end = get_due_review_deadlines()
        review_pairs = await list_due_review_items(db, user_id=user_id, today_end=today_end)

        items = [
            ReviewItem(
                schedule_id=schedule.id,
                article_id=article.id,
                title=article.title,
                level=article.level,
                stage=schedule.current_stage,
                stage_label=schedule.get_stage_label(),
                days_until_next=schedule.get_days_until_next(),
                next_review_date=schedule.next_review_date,
                source_book=article.source_book,
                source_lesson=article.source_lesson,
                last_reviewed_at=schedule.last_reviewed_at,
            )
            for schedule, article in review_pairs
        ]
        return ReviewListResponse(items=items, total=len(items))

    @staticmethod
    async def get_review_stats(db: AsyncSession, user_id: int) -> ReviewStats:
        total = await count_review_schedules(db, user_id=user_id)
        completed = await count_review_schedules(db, user_id=user_id, completed_only=True)

        today = app_today()
        _, today_end = get_due_review_deadlines()
        pending_count = await count_due_review_schedules(db, user_id=user_id, today_end=today_end)

        logs = await list_all_review_logs_for_user(db, user_id=user_id)
        streak_days = calculate_streak_days(logs)

        week_start = today - timedelta(days=today.weekday())
        week_start_dt, _ = app_day_bounds(week_start)
        weekly_completed = await count_weekly_completed_reviews(
            db,
            user_id=user_id,
            week_start=week_start_dt,
        )
        weekly_total = await count_weekly_new_schedules(
            db,
            user_id=user_id,
            week_start=week_start_dt,
        )

        return ReviewStats(
            total_schedules=total,
            completed_schedules=completed,
            today_pending=pending_count,
            streak_days=streak_days,
            weekly_completed=weekly_completed,
            weekly_total=weekly_total,
        )

    @staticmethod
    async def get_article_review_status(
        db: AsyncSession,
        user_id: int,
        article_id: int,
    ) -> ArticleReviewStatus:
        schedule = await get_user_schedule_by_article(db, user_id=user_id, article_id=article_id)

        if not schedule:
            return ArticleReviewStatus(
                is_in_review=False,
                schedule_id=None,
                current_stage=None,
                completed=False,
                total_stages=REVIEW_TOTAL_STAGES,
                next_review_date=None,
            )

        return ArticleReviewStatus(
            is_in_review=True,
            schedule_id=schedule.id,
            current_stage=schedule.current_stage,
            total_stages=REVIEW_TOTAL_STAGES,
            next_review_date=(
                schedule.next_review_date
                if schedule.current_stage < REVIEW_COMPLETED_STAGE
                else None
            ),
            completed=schedule.current_stage >= REVIEW_COMPLETED_STAGE,
        )

    @staticmethod
    async def get_review_logs(
        db: AsyncSession,
        user_id: int,
        schedule_id: int,
    ) -> ReviewLogListResponse:
        schedule = await ReviewService._get_user_schedule(db, user_id, schedule_id)
        logs = await list_review_logs_for_schedule(db, schedule_id=schedule.id)

        return ReviewLogListResponse(
            logs=[ReviewLogItem.model_validate(log) for log in logs],
            total=len(logs),
        )

    @staticmethod
    async def submit_review(
        db: AsyncSession,
        user_id: int,
        schedule_id: int,
        request: SubmitReviewRequest,
    ) -> SubmitReviewResponse:
        schedule = await ReviewService._get_user_schedule(db, user_id, schedule_id)
        if schedule.current_stage >= REVIEW_COMPLETED_STAGE:
            raise BadRequestError("该复习计划已完成")

        log = ReviewLog(
            schedule_id=schedule_id,
            stage=schedule.current_stage,
            is_quick_mode=request.is_quick_mode,
            duration_seconds=request.duration_seconds,
            preview_assessment=request.preview_assessment,
            quality_assessment=request.quality_assessment,
            correct_count=request.correct_count,
            total_count=request.total_count,
        )
        db.add(log)

        current_stage = schedule.current_stage
        next_stage = current_stage + 1
        schedule.last_reviewed_at = utc_now()
        schedule.self_assessment = request.quality_assessment

        if next_stage > REVIEW_TOTAL_STAGES:
            schedule.current_stage = REVIEW_COMPLETED_STAGE
            schedule.next_review_date = get_next_review_date(
                schedule.initial_completed_at,
                REVIEW_COMPLETED_STAGE,
            )
            completed = True
            next_review_date = None
            message = (
                f"恭喜，你已经完成全部 {REVIEW_TOTAL_STAGES} 轮复习，"
                "这篇内容已经掌握得很稳了。"
            )
        else:
            schedule.current_stage = next_stage
            schedule.next_review_date = get_next_review_date(
                schedule.initial_completed_at,
                next_stage,
            )
            completed = False
            next_review_date = schedule.next_review_date
            days = (next_review_date.astimezone(app_timezone()).date() - app_today()).days
            message = f"第 {current_stage} 轮复习完成，下次复习在 {days} 天后。"

        await db.commit()

        article_title = await get_article_title_for_schedule(db, article_id=schedule.article_id)
        await study_log_service.check_in(
            db,
            user_id,
            course_title=f"复习：{article_title}" if article_title else "复习",
        )

        return SubmitReviewResponse(
            success=True,
            completed=completed,
            next_stage=schedule.current_stage,
            next_review_date=next_review_date,
            message=message,
        )

    @staticmethod
    async def _get_user_schedule(
        db: AsyncSession,
        user_id: int,
        schedule_id: int,
    ) -> ReviewSchedule:
        schedule = await get_user_schedule_by_id(db, user_id=user_id, schedule_id=schedule_id)
        if schedule is None:
            raise NotFoundError("复习计划不存在")
        return schedule


review_service = ReviewService()
