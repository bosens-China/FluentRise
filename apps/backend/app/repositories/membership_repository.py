"""
会员仓储层。
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.membership import Membership


async def get_membership_by_user_id(
    db: AsyncSession,
    *,
    user_id: int,
) -> Membership | None:
    result = await db.execute(select(Membership).where(Membership.user_id == user_id))
    return result.scalar_one_or_none()
