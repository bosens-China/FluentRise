"""
会员模型。
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class Membership(Base):
    """用户会员状态。"""

    __tablename__ = "memberships"
    __table_args__ = (UniqueConstraint("user_id", name="uq_memberships_user_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="用户 ID",
    )
    status: Mapped[str] = mapped_column(
        String(20),
        default="trial",
        comment="会员状态：trial/active/expired",
    )
    plan_name: Mapped[str] = mapped_column(
        String(50),
        default="trial_week",
        comment="套餐名称",
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        comment="开始时间",
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        comment="到期时间",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        comment="创建时间",
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        onupdate=func.now(),
        comment="更新时间",
    )

    user: Mapped["User"] = relationship("User")

    def __repr__(self) -> str:
        return f"<Membership(user_id={self.user_id}, status={self.status}, plan={self.plan_name})>"
