"""
会员服务
"""

from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.membership import Membership


class MembershipService:
    """会员试用服务"""

    TRIAL_DAYS = 7

    @staticmethod
    async def ensure_membership(db: AsyncSession, user_id: int) -> Membership:
        """确保用户拥有会员记录。"""
        result = await db.execute(select(Membership).where(Membership.user_id == user_id))
        membership = result.scalar_one_or_none()

        if membership is None:
            now = datetime.now(UTC)
            membership = Membership(
                user_id=user_id,
                status="trial",
                plan_name="trial_week",
                started_at=now,
                expires_at=now + timedelta(days=MembershipService.TRIAL_DAYS),
            )
            db.add(membership)
            await db.commit()
            await db.refresh(membership)
            return membership

        if membership.expires_at <= datetime.now(UTC) and membership.status != "expired":
            membership.status = "expired"
            await db.commit()
            await db.refresh(membership)

        return membership

    @staticmethod
    def get_days_left(membership: Membership) -> int:
        """返回会员剩余天数。"""
        remaining = membership.expires_at - datetime.now(UTC)
        return max(0, remaining.days + (1 if remaining.seconds > 0 else 0))


membership_service = MembershipService()
