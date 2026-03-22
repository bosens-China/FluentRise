"""
用户相关路由
"""

from __future__ import annotations

from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.article import Article
from app.models.mistake_book import MistakeBookEntry
from app.models.review_schedule import ReviewSchedule
from app.models.vocabulary import Vocabulary
from app.schemas.user import (
    ENGLISH_LEVELS,
    LEARNING_GOALS,
    AssessmentDataResponse,
    AssessmentQuestion,
    EnglishLevelInfo,
    LearningGoal,
    UpdateAssessmentRequest,
    UpdateProfileRequest,
    UserInfo,
    UserProfileResponse,
)
from app.services.membership_service import membership_service
from app.services.study_log_service import study_log_service
from app.services.user_service import UserService

router = APIRouter(prefix="/user", tags=["用户"])


class MembershipStatusResponse(BaseModel):
    status: str = Field(..., description="会员状态")
    plan_name: str = Field(..., description="套餐名称")
    days_left: int = Field(..., description="剩余天数")
    expires_at: str = Field(..., description="到期时间")
    payment_ready: bool = Field(default=False, description="支付是否已接入")
    multimodal_ready: bool = Field(default=False, description="多模态是否已接入")


class DashboardOverviewResponse(BaseModel):
    streak_days: int = Field(..., description="连续打卡天数")
    today_checked_in: bool = Field(..., description="今天是否已打卡")
    completed_lessons: int = Field(..., description="已完成课文数")
    vocabulary_total: int = Field(..., description="累计生词数")
    review_pending_total: int = Field(..., description="待复习数")
    mistake_pending_total: int = Field(..., description="待巩固错题数")


ASSESSMENT_QUESTIONS = [
    AssessmentQuestion(id=1, sentence="Hello. I am Amy.", translation="你好。我是 Amy。", level=0),
    AssessmentQuestion(id=2, sentence="This is my book.", translation="这是我的书。", level=0),
    AssessmentQuestion(id=3, sentence="I like milk and bread.", translation="我喜欢牛奶和面包。", level=1),
    AssessmentQuestion(id=4, sentence="My father goes to work by bus.", translation="我爸爸坐公交去上班。", level=1),
    AssessmentQuestion(id=5, sentence="We are going to the park after lunch.", translation="我们午饭后要去公园。", level=2),
    AssessmentQuestion(id=6, sentence="She called me because she was late for class.", translation="她给我打电话，因为她上课迟到了。", level=2),
    AssessmentQuestion(id=7, sentence="I usually cook at home, but sometimes I eat out with friends.", translation="我通常在家做饭，但有时会和朋友出去吃。", level=3),
    AssessmentQuestion(id=8, sentence="When I arrived at the station, the train had already left.", translation="当我到车站时，火车已经开走了。", level=4),
    AssessmentQuestion(id=9, sentence="If I had more time after work, I would join an evening English club.", translation="如果下班后有更多时间，我会去参加晚上的英语社团。", level=5),
    AssessmentQuestion(id=10, sentence="Although online learning is flexible, it still requires steady habits and clear goals.", translation="虽然线上学习很灵活，但仍然需要稳定的习惯和明确的目标。", level=6),
]


@router.get("/me", response_model=UserInfo, summary="获取当前用户信息")
async def get_current_user_info(user: UserInfo = Depends(get_current_user)) -> UserInfo:
    return user


@router.get("/profile", response_model=UserProfileResponse, summary="获取用户完整资料")
async def get_user_profile(
    current_user: UserInfo = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserProfileResponse:
    level_info = None
    if current_user.english_level is not None:
        level_data = ENGLISH_LEVELS.get(current_user.english_level)
        if level_data:
            level_info = EnglishLevelInfo(level=current_user.english_level, **level_data)

    goal_details: list[LearningGoal] = []
    for goal_id in current_user.learning_goals or []:
        matched = next((goal for goal in LEARNING_GOALS if goal["id"] == goal_id), None)
        if matched:
            goal_details.append(LearningGoal(**matched))

    return UserProfileResponse(user=current_user, level_info=level_info, goal_details=goal_details)


@router.get("/membership", response_model=MembershipStatusResponse, summary="获取会员状态")
async def get_membership_status(
    current_user: UserInfo = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MembershipStatusResponse:
    membership = await membership_service.ensure_membership(db, current_user.id)
    return MembershipStatusResponse(
        status=membership.status,
        plan_name=membership.plan_name,
        days_left=membership_service.get_days_left(membership),
        expires_at=membership.expires_at.isoformat(),
        payment_ready=False,
        multimodal_ready=False,
    )


@router.get("/dashboard-overview", response_model=DashboardOverviewResponse, summary="获取首页概览")
async def get_dashboard_overview(
    current_user: UserInfo = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DashboardOverviewResponse:
    """聚合首页成就面板所需数据。"""
    streak = await study_log_service.get_streak(db, current_user.id)

    completed_lessons_result = await db.execute(
        select(func.count())
        .select_from(Article)
        .where(Article.user_id == current_user.id)
        .where(Article.is_completed.is_(True))
    )
    vocabulary_total_result = await db.execute(
        select(func.count())
        .select_from(Vocabulary)
        .where(Vocabulary.user_id == current_user.id)
    )
    review_pending_total_result = await db.execute(
        select(func.count())
        .select_from(ReviewSchedule)
        .where(ReviewSchedule.user_id == current_user.id)
        .where(ReviewSchedule.current_stage < 8)
        .where(ReviewSchedule.next_review_date <= datetime.combine(date.today(), datetime.max.time()))
    )
    mistake_pending_total_result = await db.execute(
        select(func.count())
        .select_from(MistakeBookEntry)
        .where(MistakeBookEntry.user_id == current_user.id)
        .where(MistakeBookEntry.is_mastered.is_(False))
    )

    return DashboardOverviewResponse(
        streak_days=streak.streak_days,
        today_checked_in=streak.today_checked_in,
        completed_lessons=int(completed_lessons_result.scalar_one()),
        vocabulary_total=int(vocabulary_total_result.scalar_one()),
        review_pending_total=int(review_pending_total_result.scalar_one()),
        mistake_pending_total=int(mistake_pending_total_result.scalar_one()),
    )


@router.put("/profile", response_model=UserInfo, summary="更新用户资料")
async def update_profile(
    request: UpdateProfileRequest,
    current_user: UserInfo = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserInfo:
    updated_user = await UserService.update_profile(db, current_user.id, request)
    return UserInfo.model_validate(updated_user)


@router.get("/assessment/data", response_model=AssessmentDataResponse, summary="获取评测数据")
async def get_assessment_data() -> AssessmentDataResponse:
    levels = [EnglishLevelInfo(level=level, **data) for level, data in ENGLISH_LEVELS.items()]
    goals = [LearningGoal(**goal) for goal in LEARNING_GOALS]
    return AssessmentDataResponse(levels=levels, goals=goals, questions=ASSESSMENT_QUESTIONS)


@router.post("/assessment", response_model=UserInfo, summary="提交英语水平评测")
async def submit_assessment(
    request: UpdateAssessmentRequest,
    current_user: UserInfo = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserInfo:
    valid_goal_ids = {goal["id"] for goal in LEARNING_GOALS}
    for goal_id in request.learning_goals:
        if goal_id not in valid_goal_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"无效的学习目标: {goal_id}",
            )

    updated_user = await UserService.update_assessment(db, current_user.id, request)
    return UserInfo.model_validate(updated_user)


@router.put("/assessment", response_model=UserInfo, summary="重新评测英语水平")
async def reupdate_assessment(
    request: UpdateAssessmentRequest,
    current_user: UserInfo = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserInfo:
    return await submit_assessment(request, current_user, db)
