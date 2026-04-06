"""
学习路径建议仓储层。
"""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.article import ArticleProposal


async def list_pending_proposals(
    db: AsyncSession,
    *,
    user_id: int,
) -> list[ArticleProposal]:
    result = await db.execute(
        select(ArticleProposal)
        .where(ArticleProposal.user_id == user_id, ArticleProposal.status == "pending")
        .order_by(ArticleProposal.order_index)
    )
    return list(result.scalars().all())


async def count_pending_proposals(db: AsyncSession, *, user_id: int) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(ArticleProposal)
        .where(ArticleProposal.user_id == user_id, ArticleProposal.status == "pending")
    )
    return int(result.scalar_one())


async def get_max_order_index(db: AsyncSession, *, user_id: int) -> int:
    result = await db.execute(
        select(func.max(ArticleProposal.order_index)).where(ArticleProposal.user_id == user_id)
    )
    return int(result.scalar_one() or 0)


async def list_proposal_titles_for_user(db: AsyncSession, *, user_id: int) -> list[str]:
    result = await db.execute(select(ArticleProposal.title).where(ArticleProposal.user_id == user_id))
    return list(result.scalars().all())


async def get_user_proposal_by_id(
    db: AsyncSession,
    *,
    user_id: int,
    proposal_id: int,
) -> ArticleProposal | None:
    result = await db.execute(
        select(ArticleProposal).where(
            ArticleProposal.id == proposal_id,
            ArticleProposal.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()
