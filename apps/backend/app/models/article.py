"""
学习文章模型。
"""

from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class ArticleProposal(Base):
    """预生成的课文建议/路径节点。"""

    __tablename__ = "article_proposals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="用户 ID",
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False, comment="建议标题")
    description: Mapped[str | None] = mapped_column(Text, nullable=True, comment="建议简介/导读")
    level: Mapped[int] = mapped_column(Integer, nullable=False, comment="预计难度等级")
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0, comment="路径序号")
    status: Mapped[str] = mapped_column(
        String(20),
        default="pending",
        server_default="pending",
        comment="状态: pending/realized",
    )
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

    user: Mapped["User"] = relationship("User", back_populates="proposals")
    article: Mapped["Article | None"] = relationship(
        "Article", back_populates="proposal", uselist=False
    )

    def __repr__(self) -> str:
        return f"<ArticleProposal(id={self.id}, title={self.title}, status={self.status})>"


class Article(Base):
    """学习文章。"""

    __tablename__ = "articles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="用户 ID",
    )
    proposal_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("article_proposals.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="关联的建议 ID",
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False, comment="文章标题")
    publish_date: Mapped[date | None] = mapped_column(
        Date, nullable=True, index=True, comment="发布日期(可选)"
    )
    level: Mapped[int] = mapped_column(Integer, nullable=False, comment="难度等级 0-6")
    source_book: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="来源册数")
    source_lesson: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="来源课次")
    content: Mapped[list[dict[str, str]]] = mapped_column(JSON, nullable=False, comment="双语正文")
    vocabulary: Mapped[list[dict[str, Any]] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="生词列表",
    )
    grammar: Mapped[list[dict[str, Any]] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="语法讲解",
    )
    tips: Mapped[list[dict[str, str]] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="文化提示",
    )
    exercises: Mapped[list[dict[str, Any]] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="配套练习",
    )
    is_read: Mapped[int] = mapped_column(Integer, default=0, comment="阅读进度 0-100")
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否完成学习")
    needs_repeat: Mapped[bool] = mapped_column(
        Boolean, default=False, comment="是否需要明天重学(软失败)"
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="完成时间",
    )
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

    user: Mapped["User"] = relationship("User", back_populates="articles")
    proposal: Mapped["ArticleProposal | None"] = relationship(
        "ArticleProposal", back_populates="article"
    )

    def __repr__(self) -> str:
        return f"<Article(id={self.id}, title={self.title}, level={self.level})>"
