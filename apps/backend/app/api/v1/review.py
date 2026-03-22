"""
艾宾浩斯复习系统 API 路由
"""

from datetime import date, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
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
from app.schemas.user import UserInfo
from app.services.study_log_service import study_log_service

router = APIRouter(prefix="/reviews", tags=["复习"])


def get_due_review_deadlines() -> tuple[date, datetime, datetime]:
    """返回今日日期以及到期查询使用的时间边界。"""
    today = date.today()
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today, datetime.max.time())
    return today, today_start, today_end


def build_due_review_filters(user_id: int, today_end: datetime) -> Any:
    """构建“今天及以前到期”的复习计划筛选条件。"""
    return and_(
        ReviewSchedule.user_id == user_id,
        ReviewSchedule.current_stage < 8,
        ReviewSchedule.next_review_date <= today_end,
    )


def calculate_streak_days(logs: list[ReviewLog]) -> int:
    """计算连续复习天数"""
    if not logs:
        return 0
    
    # 获取有复习记录的日期（去重，倒序）
    review_dates = sorted(
        set(log.reviewed_at.date() for log in logs),
        reverse=True
    )
    
    if not review_dates:
        return 0
    
    # 检查今天或昨天是否有复习
    today = date.today()
    if review_dates[0] not in [today, today - timedelta(days=1)]:
        return 0
    
    # 计算连续天数
    streak = 1
    for i in range(len(review_dates) - 1):
        if review_dates[i] - review_dates[i + 1] == timedelta(days=1):
            streak += 1
        else:
            break
    
    return streak


@router.get("/today/summary", response_model=TodayReviewSummary)
async def get_today_review_summary(
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """获取今日复习任务摘要（用于首页仪表盘弹窗提醒）"""
    _today, today_start, today_end = get_due_review_deadlines()
    
    count_result = await db.execute(
        select(func.count())
        .select_from(ReviewSchedule)
        .where(build_due_review_filters(current_user.id, today_end))
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
                    build_due_review_filters(current_user.id, today_end),
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


@router.get("/today/list", response_model=ReviewListResponse)
async def get_today_reviews(
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """获取今日详细复习列表"""
    _today, _today_start, today_end = get_due_review_deadlines()
    
    result = await db.execute(
        select(ReviewSchedule, Article)
        .join(Article, ReviewSchedule.article_id == Article.id)
        .where(build_due_review_filters(current_user.id, today_end))
        .order_by(ReviewSchedule.next_review_date)
    )
    
    items = []
    for schedule, article in result.all():
        items.append(
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
        )
    
    return ReviewListResponse(items=items, total=len(items))


@router.get("/stats", response_model=ReviewStats)
async def get_review_stats(
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """获取复习统计（用于角标和个人中心展示）"""
    # 总复习计划数
    total_result = await db.execute(
        select(func.count())
        .select_from(ReviewSchedule)
        .where(ReviewSchedule.user_id == current_user.id)
    )
    total_schedules = total_result.scalar_one()
    
    # 已完成数
    completed_result = await db.execute(
        select(func.count())
        .select_from(ReviewSchedule)
        .where(
            and_(
                ReviewSchedule.user_id == current_user.id,
                ReviewSchedule.current_stage >= 8,
            )
        )
    )
    completed_schedules = completed_result.scalar_one()
    
    # 今日待复习数（包含逾期未完成的任务）
    today, _today_start, today_end = get_due_review_deadlines()
    
    pending_result = await db.execute(
        select(func.count())
        .select_from(ReviewSchedule)
        .where(build_due_review_filters(current_user.id, today_end))
    )
    today_pending = pending_result.scalar_one()
    
    # 获取用户的所有复习日志，计算连续天数
    logs_result = await db.execute(
        select(ReviewLog)
        .join(ReviewSchedule)
        .where(ReviewSchedule.user_id == current_user.id)
        .order_by(desc(ReviewLog.reviewed_at))
    )
    all_logs = logs_result.scalars().all()
    streak_days = calculate_streak_days(list(all_logs))
    
    # 本周统计
    week_start = today - timedelta(days=today.weekday())
    week_start_dt = datetime.combine(week_start, datetime.min.time())
    
    weekly_completed_result = await db.execute(
        select(func.count())
        .select_from(ReviewLog)
        .join(ReviewSchedule)
        .where(
            and_(
                ReviewSchedule.user_id == current_user.id,
                ReviewLog.reviewed_at >= week_start_dt,
            )
        )
    )
    weekly_completed = weekly_completed_result.scalar_one()
    
    # 本周应该完成的复习数
    weekly_total_result = await db.execute(
        select(func.count())
        .select_from(ReviewSchedule)
        .where(
            and_(
                ReviewSchedule.user_id == current_user.id,
                ReviewSchedule.initial_completed_at >= week_start_dt,
            )
        )
    )
    weekly_total = weekly_total_result.scalar_one()
    
    return ReviewStats(
        total_schedules=total_schedules,
        completed_schedules=completed_schedules,
        today_pending=today_pending,
        streak_days=streak_days,
        weekly_completed=weekly_completed,
        weekly_total=weekly_total,
    )


@router.get("/article/{article_id}/status", response_model=ArticleReviewStatus)
async def get_article_review_status(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """获取文章复习状态（用于文章详情页显示复习进度条）"""
    result = await db.execute(
        select(ReviewSchedule)
        .where(
            and_(
                ReviewSchedule.user_id == current_user.id,
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


@router.get("/{schedule_id}/logs", response_model=ReviewLogListResponse)
async def get_review_logs(
    schedule_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """获取某个复习计划的详细日志"""
    # 先验证这个 schedule 属于当前用户
    schedule_result = await db.execute(
        select(ReviewSchedule).where(
            and_(
                ReviewSchedule.id == schedule_id,
                ReviewSchedule.user_id == current_user.id,
            )
        )
    )
    schedule = schedule_result.scalar_one_or_none()
    
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="复习计划不存在",
        )
    
    logs_result = await db.execute(
        select(ReviewLog)
        .where(ReviewLog.schedule_id == schedule_id)
        .order_by(desc(ReviewLog.reviewed_at))
    )
    logs = logs_result.scalars().all()
    
    return ReviewLogListResponse(
        logs=[ReviewLogItem.model_validate(log) for log in logs],
        total=len(logs),
    )


@router.post("/{schedule_id}/submit", response_model=SubmitReviewResponse)
async def submit_review(
    schedule_id: int,
    request: SubmitReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """提交复习完成，推进到下一阶段"""
    result = await db.execute(
        select(ReviewSchedule).where(
            and_(
                ReviewSchedule.id == schedule_id,
                ReviewSchedule.user_id == current_user.id,
            )
        )
    )
    schedule = result.scalar_one_or_none()
    
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="复习计划不存在",
        )
    
    if schedule.current_stage >= 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该复习计划已完成",
        )
    
    # 创建复习日志
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
    
    # 更新计划
    current_stage = schedule.current_stage
    next_stage = current_stage + 1
    
    # 根据质量自评调整策略（可选）
    # 如果用户选择"完全忘了"，可以考虑不推进阶段或重置
    if request.quality_assessment == "forgot":
        # 可以选择重置到第一阶段，或者保持当前阶段
        # 这里选择保持当前阶段，但下次还是同一天
        pass
    
    if next_stage > 7:
        # 全部完成
        schedule.current_stage = 8
        schedule.last_reviewed_at = datetime.utcnow()
        schedule.next_review_date = datetime(2099, 12, 31)
        schedule.self_assessment = request.quality_assessment
        completed = True
        next_review_date = None
        message = "🎉 恭喜！你已完成全部7轮复习，这个内容已经牢牢记住了！"
    else:
        # 推进到下一阶段
        schedule.current_stage = next_stage
        schedule.last_reviewed_at = datetime.utcnow()
        schedule.next_review_date = get_next_review_date(
            schedule.initial_completed_at, 
            next_stage
        )
        schedule.self_assessment = request.quality_assessment
        completed = False
        next_review_date = schedule.next_review_date
        days = (next_review_date.date() - date.today()).days
        message = f"✅ 第 {current_stage} 轮复习完成！下次复习在 {days} 天后"
    
    await db.commit()
    article_title_result = await db.execute(select(Article.title).where(Article.id == schedule.article_id))
    article_title = article_title_result.scalar_one_or_none()
    await study_log_service.check_in(
        db,
        current_user.id,
        course_title=f"复习：{article_title}" if article_title else "复习",
    )
    
    return SubmitReviewResponse(
        success=True,
        completed=completed,
        next_stage=schedule.current_stage,
        next_review_date=next_review_date,
        message=message,
    )
