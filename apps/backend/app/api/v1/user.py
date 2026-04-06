"""
用户相关路由。
"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.core.exceptions import BadRequestError
from app.schemas.user import (
    ENGLISH_LEVELS,
    LEARNING_GOALS,
    AssessmentDataResponse,
    AssessmentQuestion,
    DashboardOverviewResponse,
    EnglishLevelInfo,
    LearningGoal,
    MembershipStatusResponse,
    UpdateAssessmentRequest,
    UpdateProfileRequest,
    UserInfo,
    UserProfileResponse,
)
from app.services.membership_service import membership_service
from app.services.user_service import UserService

router = APIRouter(prefix="/user", tags=["用户"])


ASSESSMENT_QUESTIONS = [
    AssessmentQuestion(id=1, sentence="Hello. I am Amy.", translation="你好。我是 Amy。", level=0),
    AssessmentQuestion(id=2, sentence="This is my book.", translation="这是我的书。", level=0),
    AssessmentQuestion(
        id=3,
        sentence="I like milk and bread.",
        translation="我喜欢牛奶和面包。",
        level=1,
    ),
    AssessmentQuestion(
        id=4,
        sentence="My father goes to work by bus.",
        translation="我爸爸坐公交去上班。",
        level=1,
    ),
    AssessmentQuestion(
        id=5,
        sentence="We are going to the park after lunch.",
        translation="我们午饭后要去公园。",
        level=2,
    ),
    AssessmentQuestion(
        id=6,
        sentence="She called me because she was late for class.",
        translation="她给我打电话，因为她上课迟到了。",
        level=2,
    ),
    AssessmentQuestion(
        id=7,
        sentence="I usually cook at home, but sometimes I eat out with friends.",
        translation="我通常在家做饭，但有时会和朋友出去吃。",
        level=3,
    ),
    AssessmentQuestion(
        id=8,
        sentence="When I arrived at the station, the train had already left.",
        translation="当我到车站时，火车已经开走了。",
        level=4,
    ),
    AssessmentQuestion(
        id=9,
        sentence="If I had more time after work, I would join an evening English club.",
        translation="如果下班后有更多时间，我会去参加晚上的英语俱乐部。",
        level=5,
    ),
    AssessmentQuestion(
        id=10,
        sentence="Although online learning is flexible, it still requires steady habits and clear goals.",
        translation="虽然线上学习很灵活，但仍然需要稳定的习惯和明确的目标。",
        level=6,
    ),
]


@router.get("/me", response_model=UserInfo, summary="获取当前用户信息")
async def get_current_user_info(user: CurrentUser) -> UserInfo:
    return user


@router.get("/profile", response_model=UserProfileResponse, summary="获取用户完整资料")
async def get_user_profile(
    current_user: CurrentUser,
    db: DbSession,
) -> UserProfileResponse:
    del db

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
    current_user: CurrentUser,
    db: DbSession,
) -> MembershipStatusResponse:
    membership = await membership_service.ensure_membership(db=db, user_id=current_user.id)
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
    current_user: CurrentUser,
    db: DbSession,
) -> DashboardOverviewResponse:
    return await UserService.get_dashboard_overview(db=db, user_id=current_user.id)


@router.put("/profile", response_model=UserInfo, summary="更新用户资料")
async def update_profile(
    request: UpdateProfileRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> UserInfo:
    updated_user = await UserService.update_profile(db=db, user_id=current_user.id, request=request)
    return UserInfo.model_validate(updated_user)


@router.get("/assessment/data", response_model=AssessmentDataResponse, summary="获取测评数据")
async def get_assessment_data() -> AssessmentDataResponse:
    levels = [EnglishLevelInfo(level=level, **data) for level, data in ENGLISH_LEVELS.items()]
    goals = [LearningGoal(**goal) for goal in LEARNING_GOALS]
    return AssessmentDataResponse(levels=levels, goals=goals, questions=ASSESSMENT_QUESTIONS)


def validate_learning_goals(learning_goals: list[str]) -> None:
    """校验学习目标是否合法。"""
    valid_goal_ids = {goal["id"] for goal in LEARNING_GOALS}
    for goal_id in learning_goals:
        if goal_id not in valid_goal_ids:
            raise BadRequestError(f"无效的学习目标: {goal_id}")


@router.post("/assessment", response_model=UserInfo, summary="提交英语水平测评")
async def submit_assessment(
    request: UpdateAssessmentRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> UserInfo:
    validate_learning_goals(request.learning_goals)
    updated_user = await UserService.update_assessment(
        db=db, user_id=current_user.id, request=request
    )
    return UserInfo.model_validate(updated_user)


@router.put("/assessment", response_model=UserInfo, summary="重新提交英语水平测评")
async def reupdate_assessment(
    request: UpdateAssessmentRequest,
    current_user: CurrentUser,
    db: DbSession,
) -> UserInfo:
    validate_learning_goals(request.learning_goals)
    updated_user = await UserService.update_assessment(
        db=db, user_id=current_user.id, request=request
    )
    return UserInfo.model_validate(updated_user)
