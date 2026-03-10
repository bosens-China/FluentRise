"""
艾宾浩斯复习计划服务
"""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.review_schedule import ReviewSchedule, get_next_review_date


class ReviewService:
    """复习服务"""

    @staticmethod
    async def create_review_schedule(
        db: AsyncSession,
        user_id: int,
        article_id: int,
    ) -> ReviewSchedule | None:
        """
        用户首次完成文章学习时，创建艾宾浩斯复习计划
        
        Args:
            db: 数据库会话
            user_id: 用户ID
            article_id: 文章ID
            
        Returns:
            创建的复习计划，如果已存在则返回 None
        """
        # 检查是否已存在复习计划
        existing_result = await db.execute(
            select(ReviewSchedule).where(
                ReviewSchedule.user_id == user_id,
                ReviewSchedule.article_id == article_id,
            )
        )
        if existing_result.scalar_one_or_none():
            # 已存在，不重复创建
            return None
        
        now = datetime.utcnow()
        # 第一次复习在1天后
        first_review = get_next_review_date(now, 1)
        
        schedule = ReviewSchedule(
            user_id=user_id,
            article_id=article_id,
            current_stage=1,
            next_review_date=first_review,
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
        """获取或创建复习计划"""
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
        """检查是否有活跃的复习计划（未完成）"""
        result = await db.execute(
            select(ReviewSchedule).where(
                ReviewSchedule.user_id == user_id,
                ReviewSchedule.article_id == article_id,
                ReviewSchedule.current_stage < 8,
            )
        )
        return result.scalar_one_or_none() is not None


# 全局服务实例
review_service = ReviewService()
