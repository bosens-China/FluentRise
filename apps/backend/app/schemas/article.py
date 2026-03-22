"""
文章相关 Pydantic 模型
"""

from __future__ import annotations

import datetime

from pydantic import BaseModel, Field


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
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class ArticleListItem(BaseModel):
    """文章列表项。"""

    id: int
    title: str
    publish_date: datetime.date
    level: int
    is_completed: bool
    created_at: datetime.datetime

    model_config = {"from_attributes": True}


class ArticleListResponse(BaseModel):
    """文章列表响应。"""

    items: list[ArticleListItem]
    total: int


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
    exercise_results: list[ExerciseResultItem] | None = Field(None, description="练习结果")


class RegenerateArticleRequest(BaseModel):
    """文章重生成反馈。"""

    feedback_reason: str = Field(..., description="反馈原因")
    feedback_comment: str | None = Field(None, description="补充说明")


class SubmitExerciseRequest(BaseModel):
    """提交单题练习答案。"""

    exercise_index: int = Field(..., ge=0, description="题目索引")
    answer: str = Field(..., description="用户答案")
