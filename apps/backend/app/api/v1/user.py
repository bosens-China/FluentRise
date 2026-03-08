"""
用户相关路由
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
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
from app.services.user_service import UserService

router = APIRouter(prefix="/user", tags=["用户"])


# 评估测试句子（10个，对应不同等级，难度逐渐递增）
ASSESSMENT_QUESTIONS = [
    AssessmentQuestion(
        id=1,
        sentence="Hello. I am Anna.",
        translation="你好。我是安娜。",
        level=0,
    ),
    AssessmentQuestion(
        id=2,
        sentence="I like coffee, but I don't like tea.",
        translation="我喜欢咖啡，但我不喜欢茶。",
        level=1,
    ),
    AssessmentQuestion(
        id=3,
        sentence="Yesterday I went to the supermarket with my friend to buy some fresh vegetables.",
        translation="昨天我和朋友去了超市买些新鲜蔬菜。",
        level=2,
    ),
    AssessmentQuestion(
        id=4,
        sentence="Although it was raining heavily, we decided to go hiking because we had been planning this trip for weeks.",
        translation="尽管雨下得很大，我们还是决定去徒步，因为我们已经计划这次旅行好几周了。",
        level=3,
    ),
    AssessmentQuestion(
        id=5,
        sentence="Could you please tell me how to get to the nearest subway station? I'm not familiar with this area yet.",
        translation="您能告诉我怎么去最近的地铁站吗？我对这一带还不太熟悉。",
        level=4,
    ),
    AssessmentQuestion(
        id=6,
        sentence="I would like to schedule a meeting with the marketing team next Tuesday afternoon to discuss our new product launch strategy.",
        translation="我想安排下周二下午与营销团队开个会，讨论我们的新产品发布策略。",
        level=5,
    ),
    AssessmentQuestion(
        id=7,
        sentence="The company's quarterly financial report indicates that revenue has grown by 25% compared to the same period last year, largely driven by expansion into emerging markets.",
        translation="公司的季度财务报告显示，与去年同期相比收入增长25%，主要得益于向新兴市场的扩张。",
        level=6,
    ),
    AssessmentQuestion(
        id=8,
        sentence="Could you elaborate on the potential implications of this policy change for small and medium-sized enterprises operating within the technology sector?",
        translation="您能详细说明这项政策变更对科技领域中小型企业可能产生的影响吗？",
        level=6,
    ),
    AssessmentQuestion(
        id=9,
        sentence="The research methodology employed in this study warrants further validation, particularly given the relatively small sample size and potential selection bias that may have influenced the outcomes.",
        translation="本研究采用的方法论需要进一步验证，特别是考虑到相对较小的样本量以及可能影响结果的选择偏差。",
        level=6,
    ),
    AssessmentQuestion(
        id=10,
        sentence="In light of the unprecedented challenges posed by globalization and rapid technological advancement, we need to fundamentally reconsider our strategic approach from a more holistic, long-term perspective that takes into account sustainable development and stakeholder interests.",
        translation="鉴于全球化和快速技术进步带来的前所未有的挑战，我们需要从更全面、更长远的角度重新考虑我们的战略方针，充分考虑可持续发展和利益相关者的利益。",
        level=6,
    ),
]


@router.get("/me", response_model=UserInfo, summary="获取当前用户信息")
async def get_current_user_info(
    user: UserInfo = Depends(get_current_user),
) -> UserInfo:
    """获取当前登录用户的详细信息"""
    return user


@router.get("/profile", response_model=UserProfileResponse, summary="获取用户完整资料")
async def get_user_profile(
    current_user: UserInfo = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserProfileResponse:
    """获取用户完整资料，包括等级详情和目标详情"""
    # 获取等级详情
    level_info = None
    if current_user.english_level is not None:
        level_data = ENGLISH_LEVELS.get(current_user.english_level)
        if level_data:
            level_info = EnglishLevelInfo(level=current_user.english_level, **level_data)

    # 获取目标详情
    goal_details = []
    if current_user.learning_goals:
        for goal_id in current_user.learning_goals:
            for goal in LEARNING_GOALS:
                if goal["id"] == goal_id:
                    goal_details.append(LearningGoal(**goal))
                    break

    return UserProfileResponse(
        user=current_user,
        level_info=level_info,
        goal_details=goal_details,
    )


@router.put("/profile", response_model=UserInfo, summary="更新用户资料")
async def update_profile(
    request: UpdateProfileRequest,
    current_user: UserInfo = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserInfo:
    """更新用户昵称、头像等基本信息"""
    updated_user = await UserService.update_profile(db, current_user.id, request)
    return UserInfo.model_validate(updated_user)


@router.get("/assessment/data", response_model=AssessmentDataResponse, summary="获取评估数据")
async def get_assessment_data() -> AssessmentDataResponse:
    """
    获取英语水平评估所需的所有数据：
    - 所有等级定义
    - 所有学习目标选项
    - 10个测试句子
    """
    levels = [EnglishLevelInfo(level=level, **data) for level, data in ENGLISH_LEVELS.items()]

    goals = [LearningGoal(**goal) for goal in LEARNING_GOALS]

    return AssessmentDataResponse(
        levels=levels,
        goals=goals,
        questions=ASSESSMENT_QUESTIONS,
    )


@router.post("/assessment", response_model=UserInfo, summary="提交英语水平评估")
async def submit_assessment(
    request: UpdateAssessmentRequest,
    current_user: UserInfo = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserInfo:
    """
    提交英语水平评估结果和学习目标
    - english_level: 0-6
    - learning_goals: 目标ID列表
    - custom_goal: 自定义目标（可选）
    """
    # 验证学习目标ID是否有效
    valid_goal_ids = {goal["id"] for goal in LEARNING_GOALS}
    for goal_id in request.learning_goals:
        if goal_id not in valid_goal_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"无效的学习目标: {goal_id}",
            )

    updated_user = await UserService.update_assessment(db, current_user.id, request)
    return UserInfo.model_validate(updated_user)


@router.put("/assessment", response_model=UserInfo, summary="重新评估英语水平")
async def reupdate_assessment(
    request: UpdateAssessmentRequest,
    current_user: UserInfo = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserInfo:
    """重新设置英语水平和学习目标"""
    return await submit_assessment(request, current_user, db)
