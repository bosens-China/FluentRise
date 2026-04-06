"""
笔记模型。
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Note(Base):
    """用户笔记。"""

    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        comment="用户 ID",
    )
    article_id: Mapped[int | None] = mapped_column(
        ForeignKey("articles.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="关联文章 ID",
    )
    title: Mapped[str | None] = mapped_column(String(255), nullable=True, comment="笔记标题")
    content: Mapped[str] = mapped_column(Text, comment="笔记内容")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        comment="创建时间",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        comment="更新时间",
    )

    user = relationship("User", back_populates="notes")
    article = relationship("Article")

    def __repr__(self) -> str:
        return f"<Note(id={self.id}, user_id={self.user_id}, title={self.title})>"
