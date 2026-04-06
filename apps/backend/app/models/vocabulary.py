"""
生词本模型。
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.article import Article
    from app.models.user import User


class Vocabulary(Base):
    """用户生词记录。"""

    __tablename__ = "vocabularies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="用户 ID",
    )
    article_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("articles.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="来源文章 ID",
    )
    word: Mapped[str] = mapped_column(String(100), nullable=False, index=True, comment="单词")
    uk_phonetic: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="英式音标")
    us_phonetic: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="美式音标")
    meaning: Mapped[str] = mapped_column(String(500), nullable=False, comment="中文释义")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        comment="添加时间",
    )

    user: Mapped["User"] = relationship("User")
    article: Mapped["Article"] = relationship("Article")

    def __repr__(self) -> str:
        return f"<Vocabulary(id={self.id}, word={self.word})>"
