"""
学习打卡记录模型
"""

from datetime import date as date_type
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class StudyLog(Base):
    """学习打卡记录表"""

    __tablename__ = "study_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, comment="用户ID"
    )
    date: Mapped[date_type] = mapped_column(Date, nullable=False, index=True, comment="打卡日期")
    course_title: Mapped[str | None] = mapped_column(String(200), nullable=True, comment="课程名称")

    # 时间戳
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), comment="创建时间"
    )

    # 关联用户
    user: Mapped["User"] = relationship("User", back_populates="study_logs")

    # 复合唯一索引，确保一个用户一天只能有一条打卡记录
    __table_args__ = (UniqueConstraint("user_id", "date", name="uix_user_date"),)

    def __repr__(self) -> str:
        return f"<StudyLog(id={self.id}, user_id={self.user_id}, date={self.date})>"
