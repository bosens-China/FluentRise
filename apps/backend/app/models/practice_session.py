"""
游乐园训练会话模型。
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class PracticeSession(Base):
    """用户训练记录。"""

    __tablename__ = "practice_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="用户 ID",
    )
    total_questions: Mapped[int] = mapped_column(Integer, default=0, comment="总题数")
    correct_count: Mapped[int] = mapped_column(Integer, default=0, comment="答对数")
    wrong_count: Mapped[int] = mapped_column(Integer, default=0, comment="答错数")
    skipped_count: Mapped[int] = mapped_column(Integer, default=0, comment="跳过数")
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0, comment="耗时秒数")
    max_streak: Mapped[int] = mapped_column(Integer, default=0, comment="最高连击")
    details: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON,
        default=list,
        comment="题目详情",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        comment="创建时间",
    )

    user: Mapped["User"] = relationship("User")

    def __repr__(self) -> str:
        return (
            f"<PracticeSession(id={self.id}, user_id={self.user_id}, correct={self.correct_count})>"
        )
