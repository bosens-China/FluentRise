"""
学习打卡记录 API
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.schemas.study_log import StudyLogMonthResponse, StudyLogStreakResponse
from app.schemas.user import UserInfo
from app.services.study_log_service import study_log_service

router = APIRouter(prefix="/study-logs", tags=["学习打卡"])


@router.post("/check-in", summary="今日打卡")
async def check_in(
    current_user: UserInfo = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    执行今日打卡
    """
    success = await study_log_service.check_in(db, current_user.id)
    if success:
        return {"message": "打卡成功", "success": True}
    return {"message": "今日已打卡", "success": False}


@router.get("/streak", response_model=StudyLogStreakResponse, summary="获取连胜天数")
async def get_streak(
    current_user: UserInfo = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StudyLogStreakResponse:
    """
    获取当前用户的连续打卡天数以及今日是否已打卡
    """
    return await study_log_service.get_streak(db, current_user.id)


@router.get("/month", response_model=StudyLogMonthResponse, summary="获取月度打卡记录")
async def get_month_logs(
    year: int = Query(..., description="年份，如 2024"),
    month: int = Query(..., description="月份，1-12"),
    current_user: UserInfo = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StudyLogMonthResponse:
    """
    获取指定月份的所有打卡日期
    """
    return await study_log_service.get_month_logs(db, current_user.id, year, month)
