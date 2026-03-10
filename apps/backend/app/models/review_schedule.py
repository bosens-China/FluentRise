"""
艾宾浩斯遗忘曲线复习计划模型
"""

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
    """艾宾浩斯复习阶段: 1,2,3,5,7,15,30 天"""
    STAGE_1 = 1  # 1天后
    STAGE_2 = 2  # 2天后
    STAGE_3 = 3  # 3天后
    STAGE_4 = 4  # 5天后
    STAGE_5 = 5  # 7天后
    STAGE_6 = 6  # 15天后
    STAGE_7 = 7  # 30天后
    COMPLETED = 8  # 全部完成


# 艾宾浩斯复习间隔天数（累计天数）
REVIEW_INTERVALS = [1, 2, 3, 5, 7, 15, 30]


def get_next_review_date(initial_completed_at: datetime, stage: int) -> datetime:
    """
    根据初始完成时间和当前阶段，计算下次复习日期
    
    stage 1 -> 1天后
    stage 2 -> 2天后（累计）
    stage 3 -> 3天后（累计）
    ...以此类推
    """
    if stage > 7:
        return datetime(2099, 12, 31)  # 已完成，返回一个遥远的日期
    
    days = REVIEW_INTERVALS[stage - 1]
    return initial_completed_at + timedelta(days=days)


class ReviewSchedule(Base):
    """复习计划表"""

    __tablename__ = "review_schedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
        comment="用户ID",
    )
    article_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("articles.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
        comment="文章ID",
    )

    # 当前复习阶段 (1-7, 8表示完成)
    current_stage: Mapped[int] = mapped_column(
        Integer,
        default=1,
        comment="当前复习阶段 1-7，8表示全部完成",
    )

    # 下次复习日期
    next_review_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        comment="下次应复习日期",
    )

    # 首次完成学习的时间（用于计算后续复习日期）
    initial_completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        comment="首次完成学习的时间",
    )

    # 最后一次复习时间
    last_reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="最后一次复习时间",
    )

    # 复习质量自评（可选）
    self_assessment: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        comment="复习质量自评: mastered(掌握), fuzzy(模糊), forgot(遗忘)",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        comment="创建时间",
    )

    # 关联
    user: Mapped["User"] = relationship("User", back_populates="review_schedules")
    article: Mapped["Article"] = relationship("Article")
    logs: Mapped[list["ReviewLog"]] = relationship(
        "ReviewLog",
        back_populates="schedule",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def get_stage_label(self) -> str:
        """获取阶段标签"""
        if self.current_stage >= 8:
            return "已完成"
        return f"第 {self.current_stage}/7 轮"

    def get_days_until_next(self) -> int:
        """距离下次复习还有几天"""
        from datetime import date
        today = date.today()
        next_date = self.next_review_date.date() if self.next_review_date else today
        return (next_date - today).days

    def __repr__(self) -> str:
        return f"<ReviewSchedule(id={self.id}, stage={self.current_stage}, next={self.next_review_date})>"


class ReviewLog(Base):
    """复习记录日志表"""

    __tablename__ = "review_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    schedule_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("review_schedules.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
        comment="复习计划ID",
    )

    # 第几次复习
    stage: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        comment="第几次复习 1-7",
    )

    # 复习用时（秒）
    duration_seconds: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="复习用时（秒）",
    )

    # 是否快速复习模式
    is_quick_mode: Mapped[bool] = mapped_column(
        default=False,
        comment="是否为快速复习模式",
    )

    # 复习前自评（还记得多少）
    preview_assessment: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        comment="复习前自评: clear(清楚), fuzzy(模糊), forgot(完全忘了)",
    )

    # 复习后自评
    quality_assessment: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        comment="复习质量自评: mastered(掌握), fuzzy(模糊), forgot(遗忘)",
    )

    # 练习题正确数
    correct_count: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="练习题正确数",
    )

    # 练习题总数
    total_count: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        comment="练习题总数",
    )

    reviewed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        comment="复习时间",
    )

    # 关联
    schedule: Mapped["ReviewSchedule"] = relationship("ReviewSchedule", back_populates="logs")

    def __repr__(self) -> str:
        return f"<ReviewLog(id={self.id}, stage={self.stage}, at={self.reviewed_at})>"
