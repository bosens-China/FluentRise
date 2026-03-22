"""
用户相关 Pydantic 模型
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

ENGLISH_LEVELS = {
    0: {
        "label": "完全零基础",
        "cefr": "Starter",
        "vocabulary": 0,
        "description": "还不能稳定认读英语，先从最短句和最基础词开始。",
    },
    1: {
        "label": "启蒙",
        "cefr": "Pre-A1",
        "vocabulary": 120,
        "description": "能认出常见字母和少量高频词，适合超短对话。",
    },
    2: {
        "label": "入门",
        "cefr": "Pre-A1+",
        "vocabulary": 280,
        "description": "能理解简单打招呼、自我介绍和常见生活表达。",
    },
    3: {
        "label": "初级",
        "cefr": "A1",
        "vocabulary": 550,
        "description": "能看懂短句和非常简单的生活场景交流。",
    },
    4: {
        "label": "进阶",
        "cefr": "A2",
        "vocabulary": 1000,
        "description": "能处理旅行、购物、校园或家庭等常见场景。",
    },
    5: {
        "label": "实用",
        "cefr": "B1",
        "vocabulary": 1800,
        "description": "能读懂实用短文，并进行比较完整的表达。",
    },
    6: {
        "label": "自主表达",
        "cefr": "B2",
        "vocabulary": 3200,
        "description": "能较自然地讨论熟悉话题，也能处理更复杂的文本。",
    },
}

LEARNING_GOALS = [
    {"id": "daily", "label": "日常交流", "icon": "💬", "description": "朋友聊天、家庭生活、基础社交"},
    {"id": "travel", "label": "旅游出行", "icon": "✈️", "description": "机场、酒店、问路、点餐"},
    {"id": "work", "label": "办公需求", "icon": "💼", "description": "邮件、会议、职业沟通"},
    {"id": "study", "label": "学习提升", "icon": "📚", "description": "课堂、留学、阅读训练"},
    {"id": "exam", "label": "考试准备", "icon": "📝", "description": "学校考试、语言考试、阶段复习"},
    {"id": "parent", "label": "亲子陪伴", "icon": "👨‍👩‍👧", "description": "辅导孩子、家庭英语启蒙"},
    {"id": "hobby", "label": "兴趣拓展", "icon": "🎧", "description": "歌曲、影视、兴趣内容"},
]


class EnglishLevelInfo(BaseModel):
    level: int = Field(..., ge=0, le=6, description="等级")
    label: str = Field(..., description="等级名称")
    cefr: str = Field(..., description="CEFR 对应")
    vocabulary: int = Field(..., description="参考词汇量")
    description: str = Field(..., description="等级说明")


class LearningGoal(BaseModel):
    id: str = Field(..., description="目标 ID")
    label: str = Field(..., description="目标名称")
    icon: str = Field(..., description="图标")
    description: str = Field(..., description="目标说明")


class AssessmentQuestion(BaseModel):
    id: int = Field(..., description="题目 ID")
    sentence: str = Field(..., description="英文片段")
    translation: str = Field(..., description="中文释义")
    level: int = Field(..., description="对应等级")


class PhoneLoginRequest(BaseModel):
    phone: str = Field(..., pattern=r"^1[3-9]\d{9}$", description="手机号")
    code: str = Field(..., min_length=6, max_length=6, description="验证码")


class SendSmsCodeRequest(BaseModel):
    phone: str = Field(..., pattern=r"^1[3-9]\d{9}$", description="手机号")


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., description="刷新令牌")


class UpdateProfileRequest(BaseModel):
    nickname: str | None = Field(None, max_length=50, description="昵称")
    avatar: str | None = Field(None, max_length=500, description="头像 URL")


class UpdateAssessmentRequest(BaseModel):
    english_level: int = Field(..., ge=0, le=6, description="英语等级")
    learning_goals: list[str] = Field(..., description="学习目标")
    custom_goal: str | None = Field(None, max_length=200, description="自定义目标")


class TokenResponse(BaseModel):
    access_token: str = Field(..., description="访问令牌")
    refresh_token: str = Field(..., description="刷新令牌")
    token_type: str = Field(default="bearer", description="令牌类型")
    expires_in: int = Field(..., description="过期秒数")


class UserInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    phone: str
    nickname: str | None = None
    avatar: str | None = None
    email: str | None = None
    is_active: bool = True
    created_at: datetime
    english_level: int | None = None
    learning_goals: list[str] | None = None
    custom_goal: str | None = None
    has_completed_assessment: bool = False


class LoginResponse(BaseModel):
    user: UserInfo
    tokens: TokenResponse


class SmsCodeResponse(BaseModel):
    message: str
    expire_seconds: int = 300


class AssessmentDataResponse(BaseModel):
    levels: list[EnglishLevelInfo] = Field(..., description="等级信息")
    goals: list[LearningGoal] = Field(..., description="学习目标")
    questions: list[AssessmentQuestion] = Field(..., description="评测片段")


class UserProfileResponse(BaseModel):
    user: UserInfo
    level_info: EnglishLevelInfo | None = None
    goal_details: list[LearningGoal] = Field(default_factory=list)


class MessageResponse(BaseModel):
    message: str


class NeedAssessmentResponse(BaseModel):
    need_assessment: bool = True
    message: str = "请先完成英语水平评测"
