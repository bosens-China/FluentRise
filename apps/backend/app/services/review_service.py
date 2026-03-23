"""
艾宾浩斯复习计划服务。
"""

from datetime import date, datetime, timedelta
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import and_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.article import Article
from app.models.review_schedule import ReviewLog, ReviewSchedule, get_next_review_date
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
from app.services.study_log_service import study_log_service


class ReviewService:
    """复习服务。"""

    @staticmethod
    def get_due_review_deadlines() -> tuple[date, datetime, datetime]:
        """返回今日日期以及到期筛选的时间边界。"""
        today = date.today()
        today_start = datetime.combine(today, datetime.min.time())
        today_end = datetime.combine(today, datetime.max.time())
        return today, today_start, today_end

    @staticmethod
    def build_due_review_filters(user_id: int, today_end: datetime) -> Any:
        """构建“今天及以前到期”的复习计划筛选条件。"""
        return and_(
            ReviewSchedule.user_id == user_id,
            ReviewSchedule.current_stage < 8,
            ReviewSchedule.next_review_date <= today_end,
        )

    @staticmethod
    def calculate_streak_days(logs: list[ReviewLog]) -> int:
        """计算连续复习天数。"""
        if not logs:
            return 0

        review_dates = sorted({log.reviewed_at.date() for log in logs}, reverse=True)
        if not review_dates:
            return 0

        today = date.today()
        if review_dates[0] not in {today, today - timedelta(days=1)}:
            return 0

        streak = 1
        for index in range(len(review_dates) - 1):
            if review_dates[index] - review_dates[index + 1] == timedelta(days=1):
                streak += 1
            else:
                break
        return streak

    @staticmethod
    async def create_review_schedule(
        db: AsyncSession,
        user_id: int,
        article_id: int,
    ) -> ReviewSchedule | None:
        """用户首次完成文章学习时创建复习计划。"""
        existing_result = await db.execute(
            select(ReviewSchedule).where(
                ReviewSchedule.user_id == user_id,
                ReviewSchedule.article_id == article_id,
            )
        )
        if existing_result.scalar_one_or_none():
            return None

        now = datetime.utcnow()
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
        """获取或创建复习计划。"""
        result = await db.execute(
            select(ReviewSchedule).where(
                ReviewSchedule.user_id == user_id,
                ReviewSchedule.article_id == article_id,
            )
        )
        schedule = result.scalar_one_or_none()
        if schedule:
            return schedule
        return await ReviewService.create_review_schedule(db, user_id, article_id)

    @staticmethod
    async def has_active_schedule(
        db: AsyncSession,
        user_id: int,
        article_id: int,
    ) -> bool:
        """检查是否存在未完成的复习计划。"""
        result = await db.execute(
            select(ReviewSchedule).where(
                ReviewSchedule.user_id == user_id,
                ReviewSchedule.article_id == article_id,
                ReviewSchedule.current_stage < 8,
            )
        )
        return result.scalar_one_or_none() is not None

    @staticmethod
    async def get_today_review_summary(db: AsyncSession, user_id: int) -> TodayReviewSummary:
        """获取今日复习摘要。"""
        _today, today_start, today_end = ReviewService.get_due_review_deadlines()

        count_result = await db.execute(
            select(func.count())
            .select_from(ReviewSchedule)
            .where(ReviewService.build_due_review_filters(user_id, today_end))
        )
        count = count_result.scalar_one()

        if count == 0:
            message = "今天没有复习任务，继续学习新内容吧！"
        else:
            overdue_result = await db.execute(
                select(func.count())
                .select_from(ReviewSchedule)
                .where(
                    and_(
                        ReviewService.build_due_review_filters(user_id, today_end),
                        ReviewSchedule.next_review_date < today_start,
                    )
                )
            )
            overdue_count = overdue_result.scalar_one()

            if overdue_count == 0:
                message = f"今天有 {count} 个内容需要复习"
            elif overdue_count == count:
                message = f"你有 {count} 个逾期复习任务待完成"
            else:
                message = f"今天有 {count} 个待复习内容，其中 {overdue_count} 个已逾期"

        return TodayReviewSummary(has_reviews=count > 0, count=count, message=message)

    @staticmethod
    async def get_today_reviews(db: AsyncSession, user_id: int) -> ReviewListResponse:
        """获取今日详细复习列表。"""
        _today, _today_start, today_end = ReviewService.get_due_review_deadlines()

        result = await db.execute(
            select(ReviewSchedule, Article)
            .join(Article, ReviewSchedule.article_id == Article.id)
            .where(ReviewService.build_due_review_filters(user_id, today_end))
            .order_by(ReviewSchedule.next_review_date)
        )

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
            for schedule, article in result.all()
        ]

        return ReviewListResponse(items=items, total=len(items))

    @staticmethod
    async def get_review_stats(db: AsyncSession, user_id: int) -> ReviewStats:
        """获取复习统计。"""
        total_result = await db.execute(
            select(func.count())
            .select_from(ReviewSchedule)
            .where(ReviewSchedule.user_id == user_id)
        )
        completed_result = await db.execute(
            select(func.count())
            .select_from(ReviewSchedule)
            .where(
                and_(
                    ReviewSchedule.user_id == user_id,
                    ReviewSchedule.current_stage >= 8,
                )
            )
        )

        today, _today_start, today_end = ReviewService.get_due_review_deadlines()
        pending_result = await db.execute(
            select(func.count())
            .select_from(ReviewSchedule)
            .where(ReviewService.build_due_review_filters(user_id, today_end))
        )

        logs_result = await db.execute(
            select(ReviewLog)
            .join(ReviewSchedule)
            .where(ReviewSchedule.user_id == user_id)
            .order_by(desc(ReviewLog.reviewed_at))
        )
        streak_days = ReviewService.calculate_streak_days(list(logs_result.scalars().all()))

        week_start = today - timedelta(days=today.weekday())
        week_start_dt = datetime.combine(week_start, datetime.min.time())

        weekly_completed_result = await db.execute(
            select(func.count())
            .select_from(ReviewLog)
            .join(ReviewSchedule)
            .where(
                and_(
                    ReviewSchedule.user_id == user_id,
                    ReviewLog.reviewed_at >= week_start_dt,
                )
            )
        )
        weekly_total_result = await db.execute(
            select(func.count())
            .select_from(ReviewSchedule)
            .where(
                and_(
                    ReviewSchedule.user_id == user_id,
                    ReviewSchedule.initial_completed_at >= week_start_dt,
                )
            )
        )

        return ReviewStats(
            total_schedules=total_result.scalar_one(),
            completed_schedules=completed_result.scalar_one(),
            today_pending=pending_result.scalar_one(),
            streak_days=streak_days,
            weekly_completed=weekly_completed_result.scalar_one(),
            weekly_total=weekly_total_result.scalar_one(),
        )

    @staticmethod
    async def get_article_review_status(
        db: AsyncSession,
        user_id: int,
        article_id: int,
    ) -> ArticleReviewStatus:
        """获取文章复习状态。"""
        result = await db.execute(
            select(ReviewSchedule).where(
                and_(
                    ReviewSchedule.user_id == user_id,
                    ReviewSchedule.article_id == article_id,
                )
            )
        )
        schedule = result.scalar_one_or_none()

        if not schedule:
            return ArticleReviewStatus(
                is_in_review=False,
                schedule_id=None,
                current_stage=None,
                completed=False,
                total_stages=7,
                next_review_date=None,
            )

        return ArticleReviewStatus(
            is_in_review=True,
            schedule_id=schedule.id,
            current_stage=schedule.current_stage,
            total_stages=7,
            next_review_date=schedule.next_review_date if schedule.current_stage < 8 else None,
            completed=schedule.current_stage >= 8,
        )

    @staticmethod
    async def get_review_logs(
        db: AsyncSession,
        user_id: int,
        schedule_id: int,
    ) -> ReviewLogListResponse:
        """获取复习日志。"""
        schedule = await ReviewService._get_user_schedule(db, user_id, schedule_id)

        logs_result = await db.execute(
            select(ReviewLog)
            .where(ReviewLog.schedule_id == schedule.id)
            .order_by(desc(ReviewLog.reviewed_at))
        )
        logs = logs_result.scalars().all()

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
        """提交复习完成结果并推进阶段。"""
        schedule = await ReviewService._get_user_schedule(db, user_id, schedule_id)

        if schedule.current_stage >= 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="该复习计划已完成",
            )

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

        if next_stage > 7:
            schedule.current_stage = 8
            schedule.last_reviewed_at = datetime.utcnow()
            schedule.next_review_date = datetime(2099, 12, 31)
            schedule.self_assessment = request.quality_assessment
            completed = True
            next_review_date = None
            message = "恭喜！你已完成全部 7 轮复习，这个内容已经记得很牢了。"
        else:
            schedule.current_stage = next_stage
            schedule.last_reviewed_at = datetime.utcnow()
            schedule.next_review_date = get_next_review_date(
                schedule.initial_completed_at,
                next_stage,
            )
            schedule.self_assessment = request.quality_assessment
            completed = False
            next_review_date = schedule.next_review_date
            days = (next_review_date.date() - date.today()).days
            message = f"第 {current_stage} 轮复习完成！下次复习在 {days} 天后"

        await db.commit()

        article_title_result = await db.execute(
            select(Article.title).where(Article.id == schedule.article_id)
        )
        article_title = article_title_result.scalar_one_or_none()
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
        result = await db.execute(
            select(ReviewSchedule).where(
                and_(
                    ReviewSchedule.id == schedule_id,
                    ReviewSchedule.user_id == user_id,
                )
            )
        )
        schedule = result.scalar_one_or_none()
        if schedule is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="复习计划不存在",
            )
        return schedule


review_service = ReviewService()
