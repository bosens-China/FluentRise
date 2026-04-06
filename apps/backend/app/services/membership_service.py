"""
会员服务。
"""

from __future__ import annotations

from datetime import timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.time import utc_now
from app.models.membership import Membership
from app.repositories.membership_repository import get_membership_by_user_id


class MembershipService:
    """会员试用服务。"""

    TRIAL_DAYS = 7

    @staticmethod
    async def ensure_membership(*, db: AsyncSession, user_id: int) -> Membership:
        """确保用户存在会员记录。"""
        membership = await get_membership_by_user_id(db, user_id=user_id)

        if membership is None:
            now = utc_now()
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

        if membership.expires_at <= utc_now() and membership.status != "expired":
            membership.status = "expired"
            await db.commit()
            await db.refresh(membership)

        return membership

    @staticmethod
    def get_days_left(membership: Membership) -> int:
        remaining = membership.expires_at - utc_now()
        return max(0, remaining.days + (1 if remaining.seconds > 0 else 0))


membership_service = MembershipService()
