"""
复习计划模型
"""

from __future__ import annotations

from datetime import datetime, timedelta
from enum import IntEnum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.article import Article
    from app.models.user import User


class ReviewStage(IntEnum):
    """复习阶段：1、2、3、6、7、15、30 天。"""

    STAGE_1 = 1
    STAGE_2 = 2
    STAGE_3 = 3
    STAGE_4 = 4
    STAGE_5 = 5
    STAGE_6 = 6
    STAGE_7 = 7
    COMPLETED = 8


REVIEW_INTERVALS = [1, 2, 3, 6, 7, 15, 30]


def get_next_review_date(initial_completed_at: datetime, stage: int) -> datetime:
    """根据阶段返回下次复习时间。"""
    if stage > 7:
        return datetime(2099, 12, 31)

    return initial_completed_at + timedelta(days=REVIEW_INTERVALS[stage - 1])


class ReviewSchedule(Base):
    """文章复习计划。"""

    __tablename__ = "review_schedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
        comment="用户 ID",
    )
    article_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("articles.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
        comment="文章 ID",
    )
    current_stage: Mapped[int] = mapped_column(Integer, default=1, comment="当前复习阶段")
    next_review_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        comment="下次复习时间",
    )
    initial_completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        comment="首次完成学习时间",
    )
    last_reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="最近复习时间",
    )
    self_assessment: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        comment="复习后的主观评估",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        comment="创建时间",
    )

    user: Mapped["User"] = relationship("User", back_populates="review_schedules")
    article: Mapped["Article"] = relationship("Article")
    logs: Mapped[list["ReviewLog"]] = relationship(
        "ReviewLog",
        back_populates="schedule",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def get_stage_label(self) -> str:
        if self.current_stage >= 8:
            return "已完成"
        return f"第 {self.current_stage}/7 轮"

    def get_days_until_next(self) -> int:
        from datetime import date

        today = date.today()
        next_date = self.next_review_date.date() if self.next_review_date else today
        return (next_date - today).days

    def __repr__(self) -> str:
        return f"<ReviewSchedule(id={self.id}, stage={self.current_stage}, next={self.next_review_date})>"


class ReviewLog(Base):
    """复习日志。"""

    __tablename__ = "review_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    schedule_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("review_schedules.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
        comment="复习计划 ID",
    )
    stage: Mapped[int] = mapped_column(Integer, nullable=False, comment="复习轮次")
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="复习用时")
    is_quick_mode: Mapped[bool] = mapped_column(default=False, comment="是否快速复习")
    preview_assessment: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        comment="复习前自评",
    )
    quality_assessment: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        comment="复习后自评",
    )
    correct_count: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="答对数")
    total_count: Mapped[int | None] = mapped_column(Integer, nullable=True, comment="总题数")
    reviewed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        comment="复习时间",
    )

    schedule: Mapped["ReviewSchedule"] = relationship("ReviewSchedule", back_populates="logs")

    def __repr__(self) -> str:
        return f"<ReviewLog(id={self.id}, stage={self.stage}, reviewed_at={self.reviewed_at})>"
