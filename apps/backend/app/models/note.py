"""
笔记模型
"""

from datetime import datetime

from sqlalchemy import ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Note(Base):
    """用户笔记表"""

    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, comment="用户ID")
    article_id: Mapped[int | None] = mapped_column(
        ForeignKey("articles.id"), nullable=True, index=True, comment="关联文章ID"
    )

    title: Mapped[str | None] = mapped_column(String, nullable=True, comment="笔记标题")
    content: Mapped[str] = mapped_column(Text, comment="笔记内容")

    created_at: Mapped[datetime] = mapped_column(default=func.now(), comment="创建时间")
    updated_at: Mapped[datetime] = mapped_column(
        default=func.now(), onupdate=func.now(), comment="更新时间"
    )

    # 关联
    user = relationship("User", back_populates="notes")
    article = relationship("Article")

    def __repr__(self) -> str:
        return f"<Note(id={self.id}, user_id={self.user_id}, title={self.title})>"
