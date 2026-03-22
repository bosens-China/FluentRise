"""
学习反馈模型
"""

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.article import Article
    from app.models.practice_session import PracticeSession
    from app.models.user import User


class LearningFeedback(Base):
    """用户学习反馈"""

    __tablename__ = "learning_feedbacks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="用户ID",
    )
    article_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("articles.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="关联文章ID",
    )
    practice_session_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("practice_sessions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="关联练习会话ID",
    )
    module: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        comment="反馈模块: lesson/playground/review",
    )
    feedback_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        comment="反馈类型: too_easy/too_hard/just_right/repetitive/goal_mismatch/other",
    )
    comment: Mapped[str | None] = mapped_column(Text, nullable=True, comment="用户补充说明")
    payload: Mapped[dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="附加上下文",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        comment="创建时间",
    )

    user: Mapped["User"] = relationship("User")
    article: Mapped["Article"] = relationship("Article")
    practice_session: Mapped["PracticeSession"] = relationship("PracticeSession")

    def __repr__(self) -> str:
        return f"<LearningFeedback(user_id={self.user_id}, module={self.module}, type={self.feedback_type})>"
