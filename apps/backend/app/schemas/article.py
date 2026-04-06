"""
文章相关 Pydantic 模型
"""

from __future__ import annotations

import datetime

from pydantic import BaseModel, Field

from app.schemas.pagination import PaginatedItemsResponse


class BilingualContent(BaseModel):
    """双语段落内容。"""

    en: str = Field(..., description="英文内容")
    zh: str = Field(..., description="中文翻译")
    speaker: str | None = Field(None, description="说话人")


class GrammarPoint(BaseModel):
    """语法讲解点。"""

    point: str = Field(..., description="语法点名称")
    explanation: str = Field(..., description="中文解释")
    examples: list[BilingualContent] = Field(default_factory=list, description="例句")


class CultureTip(BaseModel):
    """导读或学习提示。"""

    title: str = Field(..., description="提示标题")
    content: str = Field(..., description="提示内容")


class Exercise(BaseModel):
    """课后练习。"""

    type: str = Field("choice", description="题型")
    question: str = Field(..., description="题目内容")
    options: list[str] = Field(default_factory=list, description="选项")
    answer: str = Field(..., description="正确答案")


class VocabularyWord(BaseModel):
    """生词条目。"""

    word: str = Field(..., description="英文单词")
    uk_phonetic: str | None = Field(None, description="英式音标")
    us_phonetic: str | None = Field(None, description="美式音标")
    meaning: str = Field(..., description="中文释义")


class ArticleContent(BaseModel):
    """文章完整内容。"""

    title: str = Field(..., description="文章标题")
    level: int = Field(..., ge=0, le=6, description="难度等级")
    source_book: int | None = Field(None, description="来源册数")
    source_lesson: int | None = Field(None, description="来源课次")
    vocabulary: list[VocabularyWord] = Field(default_factory=list, description="生词列表")
    content: list[BilingualContent] = Field(default_factory=list, description="正文内容")
    grammar: list[GrammarPoint] = Field(default_factory=list, description="语法讲解")
    tips: list[CultureTip] = Field(default_factory=list, description="导读与提示")
    exercises: list[Exercise] | None = Field(None, description="课后练习")


class ArticleAudioWordTiming(BaseModel):
    """全文朗读的单词时间轴。"""

    text: str = Field(..., description="单词文本")
    start_ms: int = Field(..., ge=0, description="开始时间，毫秒")
    end_ms: int = Field(..., ge=0, description="结束时间，毫秒")


class ArticleAudioSegmentTiming(BaseModel):
    """全文朗读的段落时间轴。"""

    paragraph_index: int = Field(..., ge=0, description="段落索引")
    speaker: str | None = Field(None, description="说话人")
    text: str = Field(..., description="英文段落文本")
    start_ms: int = Field(..., ge=0, description="开始时间，毫秒")
    end_ms: int = Field(..., ge=0, description="结束时间，毫秒")
    words: list[ArticleAudioWordTiming] = Field(default_factory=list, description="段内单词时间轴")


class ArticleAudioTimelineResponse(BaseModel):
    """全文朗读时间轴响应。"""

    segments: list[ArticleAudioSegmentTiming] = Field(
        default_factory=list, description="段落时间轴"
    )


class ArticleResponse(BaseModel):
    """文章响应。"""

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
    exercises: list[Exercise] | None
    is_read: int
    is_completed: bool
    needs_repeat: bool
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class ArticleListItem(BaseModel):
    """文章列表项。"""

    id: int
    title: str
    publish_date: datetime.date
    level: int
    is_completed: bool
    needs_repeat: bool
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class ArticleListResponse(PaginatedItemsResponse[ArticleListItem]):
    """文章列表响应。"""


class TodayArticleResponse(BaseModel):
    """今日文章响应。"""

    has_article: bool = Field(..., description="是否存在今日文章")
    article: ArticleResponse | None = Field(None, description="文章内容")


class GenerateArticleRequest(BaseModel):
    """生成文章请求。"""

    target_date: datetime.date | None = Field(None, description="目标日期")
    force_regenerate: bool = Field(False, description="是否强制重新生成")
    feedback_reason: str | None = Field(None, description="重新生成原因")
    feedback_comment: str | None = Field(None, description="补充反馈")


class ExerciseResultItem(BaseModel):
    """课后练习结果。"""

    question: str = Field(..., description="题目内容")
    expected_answer: str = Field(..., description="正确答案")
    user_answer: str | None = Field(None, description="用户答案")
    is_correct: bool = Field(..., description="是否答对")


class UpdateProgressRequest(BaseModel):
    """更新阅读进度请求。"""

    is_read: int = Field(..., ge=0, le=100, description="阅读进度")
    is_completed: bool | None = Field(None, description="是否完成")
    needs_repeat: bool | None = Field(None, description="是否需要明天重学(软失败)")
    exercise_results: list[ExerciseResultItem] | None = Field(None, description="练习结果")


class MiniStoryQuestionResponse(BaseModel):
    """小故事问题。"""

    id: str = Field(..., description="问题 ID")
    question_en: str = Field(..., description="英文问题")
    question_zh: str = Field(..., description="中文翻译")


class MiniStoryResponse(BaseModel):
    """变种小故事响应。"""

    story_en: str = Field(..., description="小故事英文")
    story_zh: str = Field(..., description="小故事中文")
    questions: list[MiniStoryQuestionResponse] = Field(default_factory=list, description="相关问题")


class MiniStoryEvaluateRequest(BaseModel):
    """校验小故事概述/问答请求。"""

    story_en: str = Field(..., description="小故事原文")
    questions: list[dict[str, str]] = Field(..., description="问题列表 (必须包含 id, question_en)")
    answers: dict[str, str] = Field(..., description="用户答案 (question_id -> user_answer)")


class MiniStoryEvaluateResponse(BaseModel):
    """小故事校验结果。"""

    is_passed: bool = Field(..., description="是否及格")
    score: int = Field(..., description="评分 (0-100)")
    feedback_zh: str = Field(..., description="老师鼓励和反馈")
