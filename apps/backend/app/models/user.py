"""
用户模型
"""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.article import Article
    from app.models.note import Note
    from app.models.study_log import StudyLog


class User(Base):
    """用户表"""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    phone: Mapped[str] = mapped_column(
        String(20), unique=True, index=True, nullable=False, comment="手机号"
    )
    hashed_password: Mapped[str | None] = mapped_column(
        String(255), nullable=True, comment="密码哈希"
    )

    # 用户信息
    nickname: Mapped[str | None] = mapped_column(String(50), nullable=True, comment="昵称")
    avatar: Mapped[str | None] = mapped_column(String(500), nullable=True, comment="头像URL")
    email: Mapped[str | None] = mapped_column(String(100), nullable=True, comment="邮箱")

    # 状态
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否激活")
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, comment="是否验证手机号")

    # 学习档案
    english_level: Mapped[int | None] = mapped_column(
        Integer, nullable=True, comment="英语水平 0-6 (0=零基础, 1-6对应CEFR)"
    )
    learning_goals: Mapped[list[str] | None] = mapped_column(
        JSON, nullable=True, comment="学习目标列表"
    )
    custom_goal: Mapped[str | None] = mapped_column(
        String(200), nullable=True, comment="自定义学习目标"
    )
    has_completed_assessment: Mapped[bool] = mapped_column(
        Boolean, default=False, comment="是否完成初始评估"
    )

    # AI 相关
    openai_thread_id: Mapped[str | None] = mapped_column(
        String(100), nullable=True, comment="OpenAI 对话线程ID"
    )

    # 时间戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), comment="创建时间"
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), comment="更新时间"
    )
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, comment="最后登录时间"
    )

    # 关联文章
    articles: Mapped[list["Article"]] = relationship(
        "Article", back_populates="user", cascade="all, delete-orphan"
    )

    # 关联笔记
    notes: Mapped[list["Note"]] = relationship(
        "Note", back_populates="user", cascade="all, delete-orphan"
    )

    # 关联学习打卡
    study_logs: Mapped[list["StudyLog"]] = relationship(
        "StudyLog", back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, phone={self.phone}, nickname={self.nickname})>"
