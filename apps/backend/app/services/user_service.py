"""
用户服务。
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.core.time import app_day_bounds
from app.models.user import User
from app.repositories.dashboard_repository import (
    count_completed_lessons,
    count_pending_mistakes,
    count_pending_reviews,
    count_user_vocabulary_total,
)
from app.repositories.user_repository import get_user_by_id
from app.schemas.user import (
    DashboardOverviewResponse,
    UpdateAssessmentRequest,
    UpdateProfileRequest,
)
from app.services.study_log_service import study_log_service


class UserService:
    """用户服务。"""

    @staticmethod
    async def get_user_by_id(*, db: AsyncSession, user_id: int) -> User | None:
        return await get_user_by_id(db, user_id=user_id)

    @staticmethod
    async def update_profile(
        *,
        db: AsyncSession,
        user_id: int,
        request: UpdateProfileRequest,
    ) -> User:
        user = await get_user_by_id(db, user_id=user_id)
        if user is None:
            raise NotFoundError("用户不存在")

        if request.nickname is not None:
            user.nickname = request.nickname
        if request.avatar is not None:
            user.avatar = request.avatar

        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def update_assessment(
        *,
        db: AsyncSession,
        user_id: int,
        request: UpdateAssessmentRequest,
    ) -> User:
        user = await get_user_by_id(db, user_id=user_id)
        if user is None:
            raise NotFoundError("用户不存在")

        user.english_level = request.english_level
        user.learning_goals = request.learning_goals
        user.custom_goal = request.custom_goal
        user.interests = request.interests
        user.has_completed_assessment = True

        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def get_dashboard_overview(
        *,
        db: AsyncSession,
        user_id: int,
    ) -> DashboardOverviewResponse:
        streak = await study_log_service.get_streak(db, user_id)
        _, today_end = app_day_bounds()

        completed_lessons = await count_completed_lessons(db, user_id=user_id)
        vocabulary_total = await count_user_vocabulary_total(db, user_id=user_id)
        review_pending_total = await count_pending_reviews(db, user_id=user_id, deadline=today_end)
        mistake_pending_total = await count_pending_mistakes(db, user_id=user_id)

        return DashboardOverviewResponse(
            streak_days=streak.streak_days,
            today_checked_in=streak.today_checked_in,
            completed_lessons=completed_lessons,
            vocabulary_total=vocabulary_total,
            review_pending_total=review_pending_total,
            mistake_pending_total=mistake_pending_total,
        )

    @staticmethod
    async def check_need_assessment(user: User) -> bool:
        return not user.has_completed_assessment
