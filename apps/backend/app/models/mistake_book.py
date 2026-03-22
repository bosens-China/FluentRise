"""
错题本模型
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class MistakeBookEntry(Base):
    """用户错题本条目。"""

    __tablename__ = "mistake_book_entries"
    __table_args__ = (UniqueConstraint("user_id", "item_type", "target_text", name="uq_mistake_item"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="用户 ID",
    )
    source_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        comment="来源类型：playground/article/review",
    )
    item_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        comment="项目类型：word/exercise/sentence",
    )
    target_text: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        comment="目标答案或目标内容",
    )
    prompt_text: Mapped[str | None] = mapped_column(Text, nullable=True, comment="题干或提示")
    last_user_answer: Mapped[str | None] = mapped_column(Text, nullable=True, comment="最近一次答案")
    context_text: Mapped[str | None] = mapped_column(Text, nullable=True, comment="上下文内容")
    payload: Mapped[dict[str, Any] | None] = mapped_column(
        "metadata",
        JSON,
        nullable=True,
        comment="补充信息",
    )
    mistake_count: Mapped[int] = mapped_column(Integer, default=1, comment="累计错误次数")
    correct_count: Mapped[int] = mapped_column(Integer, default=0, comment="累计纠正次数")
    is_mastered: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否掌握")
    first_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        comment="首次记录时间",
    )
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        comment="最近记录时间",
    )
    last_corrected_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="最近纠正时间",
    )

    user: Mapped["User"] = relationship("User")

    def __repr__(self) -> str:
        return f"<MistakeBookEntry(user_id={self.user_id}, item_type={self.item_type}, target={self.target_text})>"
