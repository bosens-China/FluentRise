"""
AI 对话相关 Schema。
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class AIChatRequest(BaseModel):
    """AI 对话请求。"""

    mode: str = Field(..., description="lesson 或 general")
    message: str = Field(..., min_length=1, description="用户消息")
    article_id: int | None = Field(None, description="课文模式下的文章 ID")


class AIChatResponse(BaseModel):
    """AI 对话响应。"""

    reply: str = Field(..., description="AI 回复")


class SentenceBreakdownRequest(BaseModel):
    """句子拆解请求。"""

    sentence: str = Field(..., min_length=1, description="待拆解的英文句子")
    article_id: int | None = Field(None, description="文章 ID")
    paragraph_index: int | None = Field(None, ge=0, description="句子所在段落索引")
