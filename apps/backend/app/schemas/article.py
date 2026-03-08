"""
文章相关 Pydantic 模式
"""

import datetime

from pydantic import BaseModel, Field

# ============ 基础组件 ============


class BilingualContent(BaseModel):
    """双语对照内容"""

    en: str = Field(..., description="英文内容")
    zh: str = Field(..., description="中文翻译")
    speaker: str | None = Field(None, description="说话人/角色 (如果是对话)")


class GrammarPoint(BaseModel):
    """语法点讲解"""

    point: str = Field(..., description="语法点名称")
    explanation: str = Field(..., description="详细讲解")
    examples: list[BilingualContent] = Field(default_factory=list, description="例句")


class CultureTip(BaseModel):
    """文化差异提示"""

    title: str = Field(..., description="提示标题")
    content: str = Field(..., description="提示内容")


class Exercise(BaseModel):
    """练习题"""

    type: str = Field(..., description="题目类型: choice/fill/translation")
    question: str = Field(..., description="题目内容")
    options: list[str] | None = Field(None, description="选项(选择题)")
    answer: str | None = Field(None, description="参考答案")


class VocabularyWord(BaseModel):
    """生词"""

    word: str = Field(..., description="英文单词")
    uk_phonetic: str | None = Field(None, description="英式音标，例如 /əˈbæn.dən/")
    us_phonetic: str | None = Field(None, description="美式音标，例如 /əˈbæn.dən/")
    meaning: str = Field(..., description="中文释义")


# ============ 文章数据结构 ============


class ArticleContent(BaseModel):
    """文章完整数据结构 (AI生成)"""

    title: str = Field(..., description="文章标题")
    level: int = Field(..., ge=0, le=6, description="难度等级")
    source_book: int = Field(..., description="参考新概念第几册")
    source_lesson: int = Field(..., description="参考新概念第几课")
    vocabulary: list[VocabularyWord] = Field(..., description="生词列表")
    content: list[BilingualContent] = Field(..., description="双语对照内容(段落列表)")
    grammar: list[GrammarPoint] = Field(..., description="语法讲解")
    tips: list[CultureTip] = Field(..., description="文化差异Tips")
    exercises: list[Exercise] = Field(..., description="课后练习")


# ============ API 请求/响应 ============


class ArticleResponse(BaseModel):
    """文章响应"""

    id: int
    title: str
    publish_date: datetime.date
    level: int
    source_book: int | None
    source_lesson: int | None
    vocabulary: list[VocabularyWord] | None
    content: list[BilingualContent]
    grammar: list[GrammarPoint]
    tips: list[CultureTip]
    exercises: list[Exercise]
    is_read: int
    is_completed: bool
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class ArticleListItem(BaseModel):
    """文章列表项"""

    id: int
    title: str
    publish_date: datetime.date
    level: int
    is_completed: bool
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class ArticleListResponse(BaseModel):
    """文章列表响应"""

    items: list[ArticleListItem]
    total: int


class TodayArticleResponse(BaseModel):
    """今日文章响应"""

    has_article: bool = Field(..., description="是否有今日文章")
    article: ArticleResponse | None = Field(None, description="文章详情")


class GenerateArticleRequest(BaseModel):
    """生成文章请求"""

    target_date: datetime.date | None = Field(None, description="指定日期，默认为今天")
    force_regenerate: bool = Field(False, description="强制重新生成")


class UpdateProgressRequest(BaseModel):
    """更新阅读进度请求"""

    is_read: int = Field(..., ge=0, le=100, description="阅读进度百分比")
    is_completed: bool | None = Field(None, description="是否完成")


class SubmitExerciseRequest(BaseModel):
    """提交练习答案请求"""

    exercise_index: int = Field(..., ge=0, description="练习题索引")
    answer: str = Field(..., description="用户答案")
