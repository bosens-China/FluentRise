"""
用户相关的 Pydantic 模型
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

# ============== 英语水平评估 ==============

ENGLISH_LEVELS = {
    0: {
        "label": "完全零基础",
        "cefr": "-",
        "vocabulary": 0,
        "description": "不认识英文字母或只会几个单词",
    },
    1: {
        "label": "入门",
        "cefr": "Pre-A1",
        "vocabulary": 300,
        "description": "认识字母和少量基础单词",
    },
    2: {"label": "初级", "cefr": "A1", "vocabulary": 500, "description": "能理解简单的日常用语"},
    3: {"label": "初中级", "cefr": "A2", "vocabulary": 1000, "description": "能进行简单的对话交流"},
    4: {"label": "中级", "cefr": "B1", "vocabulary": 2000, "description": "能应对工作、旅游等场景"},
    5: {
        "label": "中高级",
        "cefr": "B2",
        "vocabulary": 3500,
        "description": "能流利交流，理解复杂文本",
    },
    6: {
        "label": "高级",
        "cefr": "C1",
        "vocabulary": 5000,
        "description": "能专业/学术场合自如运用",
    },
}

LEARNING_GOALS = [
    {"id": "daily", "label": "日常交流", "icon": "💬", "description": "出国旅游、日常生活对话"},
    {"id": "work", "label": "工作提升", "icon": "💼", "description": "商务邮件、会议、职场沟通"},
    {
        "id": "study",
        "label": "出国留学",
        "icon": "🎓",
        "description": "雅思托福、学术交流、论文写作",
    },
    {
        "id": "travel",
        "label": "旅游出行",
        "icon": "✈️",
        "description": "签证面试、酒店预订、景点游览",
    },
    {"id": "exam", "label": "考试准备", "icon": "📝", "description": "四六级、考研英语、职称英语"},
    {"id": "hobby", "label": "兴趣爱好", "icon": "🎬", "description": "看美剧、听歌、阅读英文原著"},
    {"id": "parent", "label": "亲子教育", "icon": "👶", "description": "辅导孩子学习、英文启蒙"},
]


class EnglishLevelInfo(BaseModel):
    """英语水平信息"""

    level: int = Field(..., ge=0, le=6, description="等级 0-6")
    label: str = Field(..., description="等级名称")
    cefr: str = Field(..., description="CEFR标准")
    vocabulary: int = Field(..., description="词汇量")
    description: str = Field(..., description="等级描述")


class LearningGoal(BaseModel):
    """学习目标选项"""

    id: str = Field(..., description="目标ID")
    label: str = Field(..., description="目标名称")
    icon: str = Field(..., description="图标")
    description: str = Field(..., description="目标描述")


class AssessmentQuestion(BaseModel):
    """评估测试句子"""

    id: int = Field(..., description="句子ID 1-10")
    sentence: str = Field(..., description="英文句子")
    translation: str = Field(..., description="中文翻译")
    level: int = Field(..., description="对应等级")


# ============== 请求模型 ==============


class PhoneLoginRequest(BaseModel):
    """手机号登录请求"""

    phone: str = Field(..., pattern=r"^1[3-9]\d{9}$", description="手机号")
    code: str = Field(..., min_length=6, max_length=6, description="验证码")


class SendSmsCodeRequest(BaseModel):
    """发送验证码请求"""

    phone: str = Field(..., pattern=r"^1[3-9]\d{9}$", description="手机号")


class RefreshTokenRequest(BaseModel):
    """刷新令牌请求"""

    refresh_token: str = Field(..., description="刷新令牌")


class UpdateProfileRequest(BaseModel):
    """更新用户资料请求"""

    nickname: str | None = Field(None, max_length=50, description="昵称")
    avatar: str | None = Field(None, max_length=500, description="头像URL")


class UpdateAssessmentRequest(BaseModel):
    """更新英语水平评估请求"""

    english_level: int = Field(..., ge=0, le=6, description="英语水平 0-6")
    learning_goals: list[str] = Field(..., description="学习目标ID列表")
    custom_goal: str | None = Field(None, max_length=200, description="自定义学习目标")


# ============== 响应模型 ==============


class TokenResponse(BaseModel):
    """令牌响应"""

    access_token: str = Field(..., description="访问令牌")
    refresh_token: str = Field(..., description="刷新令牌")
    token_type: str = Field(default="bearer", description="令牌类型")
    expires_in: int = Field(..., description="访问令牌过期时间（秒）")


class UserInfo(BaseModel):
    """用户信息"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    phone: str
    nickname: str | None = None
    avatar: str | None = None
    email: str | None = None
    is_active: bool = True
    created_at: datetime

    # 学习档案
    english_level: int | None = None
    learning_goals: list[str] | None = None
    custom_goal: str | None = None
    has_completed_assessment: bool = False


class LoginResponse(BaseModel):
    """登录响应"""

    user: UserInfo
    tokens: TokenResponse


class SmsCodeResponse(BaseModel):
    """验证码响应"""

    message: str
    expire_seconds: int = 300


class AssessmentDataResponse(BaseModel):
    """评估数据响应"""

    levels: list[EnglishLevelInfo] = Field(..., description="所有等级信息")
    goals: list[LearningGoal] = Field(..., description="所有学习目标选项")
    questions: list[AssessmentQuestion] = Field(..., description="测试句子列表")


class UserProfileResponse(BaseModel):
    """用户完整资料响应"""

    user: UserInfo
    level_info: EnglishLevelInfo | None = None
    goal_details: list[LearningGoal] = Field(default_factory=list)


# ============== 通用响应 ==============


class MessageResponse(BaseModel):
    """通用消息响应"""

    message: str


class NeedAssessmentResponse(BaseModel):
    """需要完成评估的响应"""

    need_assessment: bool = True
    message: str = "请完成英语水平评估"
