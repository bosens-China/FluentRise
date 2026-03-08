"""
学习文章模型
"""

from datetime import date, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, Boolean, Date, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class Article(Base):
    """每日学习文章"""

    __tablename__ = "articles"
    __table_args__ = (
        UniqueConstraint("user_id", "publish_date", name="uq_articles_user_publish_date"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="用户ID",
    )

    # 文章基础信息
    title: Mapped[str] = mapped_column(String(200), nullable=False, comment="文章标题")
    publish_date: Mapped[date] = mapped_column(Date, nullable=False, index=True, comment="发布日期")

    # 难度和来源信息
    level: Mapped[int] = mapped_column(Integer, nullable=False, comment="难度等级 0-6")
    source_book: Mapped[int | None] = mapped_column(Integer, comment="新概念第几册")
    source_lesson: Mapped[int | None] = mapped_column(Integer, comment="新概念第几课")

    # 文章内容
    content: Mapped[list[dict[str, str]]] = mapped_column(
        JSON, nullable=False, comment="文章内容 [{en, zh}, ...]"
    )
    vocabulary: Mapped[list[dict[str, Any]] | None] = mapped_column(
        JSON, comment="生词 [{word, uk_phonetic, us_phonetic, meaning}, ...]"
    )
    grammar: Mapped[list[dict[str, Any]] | None] = mapped_column(
        JSON, comment="语法讲解 [{point, explanation, examples}, ...]"
    )
    tips: Mapped[list[dict[str, str]] | None] = mapped_column(
        JSON, comment="文化差异 Tips [{title, content}, ...]"
    )
    exercises: Mapped[list[dict[str, Any]] | None] = mapped_column(
        JSON, comment="练习题 [{type, question, options, answer}, ...]"
    )

    # 学习进度
    is_read: Mapped[int] = mapped_column(Integer, default=0, comment="阅读进度 0-100%")
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否完成学习")

    # 元数据
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, comment="创建时间"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间"
    )

    # 关联用户
    user: Mapped["User"] = relationship("User", back_populates="articles")

    def __repr__(self) -> str:
        return f"<Article(id={self.id}, title={self.title}, level={self.level})>"
