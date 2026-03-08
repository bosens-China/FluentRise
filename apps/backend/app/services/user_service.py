"""
用户服务
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user import UpdateAssessmentRequest, UpdateProfileRequest


class UserService:
    """用户服务类"""

    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: int) -> User | None:
        """根据ID获取用户"""
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def update_profile(db: AsyncSession, user_id: int, request: UpdateProfileRequest) -> User:
        """更新用户资料"""
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one()

        if request.nickname is not None:
            user.nickname = request.nickname
        if request.avatar is not None:
            user.avatar = request.avatar

        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def update_assessment(
        db: AsyncSession, user_id: int, request: UpdateAssessmentRequest
    ) -> User:
        """更新用户评估信息"""
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one()

        user.english_level = request.english_level
        user.learning_goals = request.learning_goals
        user.custom_goal = request.custom_goal
        user.has_completed_assessment = True

        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def check_need_assessment(user: User) -> bool:
        """检查用户是否需要完成评估"""
        return not user.has_completed_assessment
