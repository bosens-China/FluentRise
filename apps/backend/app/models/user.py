"""
用户模型。
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.article import Article, ArticleProposal
    from app.models.note import Note
    from app.models.review_schedule import ReviewSchedule
    from app.models.study_log import StudyLog


class User(Base):
    """用户表。"""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    phone: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        index=True,
        nullable=False,
        comment="手机号",
    )
    hashed_password: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        comment="密码哈希",
    )
    nickname: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="昵称")
    avatar: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="头像 URL")
    email: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="邮箱")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否启用")
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否完成手机号验证")
    english_level: Mapped[int | None] = mapped_column(
        Integer, nullable=True, comment="英语等级 0-6"
    )
    learning_goals: Mapped[list[str] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="学习目标列表",
    )
    custom_goal: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
        comment="自定义学习目标",
    )
    interests: Mapped[list[str] | None] = mapped_column(
        JSON,
        nullable=True,
        comment="个人兴趣标签",
    )
    has_completed_assessment: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        comment="是否已完成初始测评",
    )
    openai_thread_id: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
        comment="OpenAI 兼容对话线程 ID",
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
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="最后登录时间",
    )

    articles: Mapped[list["Article"]] = relationship(
        "Article",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    notes: Mapped[list["Note"]] = relationship(
        "Note",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    study_logs: Mapped[list["StudyLog"]] = relationship(
        "StudyLog",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    review_schedules: Mapped[list["ReviewSchedule"]] = relationship(
        "ReviewSchedule",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    proposals: Mapped[list["ArticleProposal"]] = relationship(
        "ArticleProposal",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, phone={self.phone}, nickname={self.nickname})>"
