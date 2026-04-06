"""
AI 对话与句子拆解 API。
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.api.deps import CurrentUser, DbSession
from app.services.ai_chat_context_service import (
    resolve_lesson_article_context,
    resolve_sentence_breakdown_context,
)
from app.services.ai_chat_service import ai_chat_service
from app.services.sentence_helper_service import (
    SentenceBreakdownResult,
    sentence_helper_service,
)

router = APIRouter(prefix="/ai-chat", tags=["AI 对话"])


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


@router.post("/respond", response_model=AIChatResponse, summary="获取 AI 对话回复")
async def respond_ai_chat(
    request: AIChatRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> Any:
    """根据课文上下文或通用问题返回 AI 回复。"""
    article_context = None
    if request.mode == "lesson":
        article_context = await resolve_lesson_article_context(
            db,
            user_id=current_user.id,
            article_id=request.article_id,
        )
    reply = await ai_chat_service.reply(
        mode=request.mode,
        message=request.message,
        user_level=current_user.english_level,
        learning_goals=current_user.learning_goals,
        article_context=article_context,
    )
    return AIChatResponse(reply=reply)


@router.post("/respond/stream", summary="流式获取 AI 对话回复")
async def respond_ai_chat_stream(
    request: AIChatRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> StreamingResponse:
    """流式返回 AI 回复。"""
    article_context = None
    if request.mode == "lesson":
        article_context = await resolve_lesson_article_context(
            db,
            user_id=current_user.id,
            article_id=request.article_id,
        )

    async def event_stream():
        async for chunk in ai_chat_service.stream_reply(
            mode=request.mode,
            message=request.message,
            user_level=current_user.english_level,
            learning_goals=current_user.learning_goals,
            article_context=article_context,
        ):
            yield chunk

    return StreamingResponse(
        event_stream(),
        media_type="text/plain; charset=utf-8",
        headers={"Cache-Control": "no-cache"},
    )


@router.post(
    "/sentence-breakdown",
    response_model=SentenceBreakdownResult,
    summary="获取句子拆解结果",
)
async def get_sentence_breakdown(
    request: SentenceBreakdownRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> SentenceBreakdownResult:
    """对课文中的句子做结构化拆解。"""
    article_context = await resolve_sentence_breakdown_context(
        db,
        user_id=current_user.id,
        article_id=request.article_id,
        paragraph_index=request.paragraph_index,
    )
    return await sentence_helper_service.analyze(
        sentence=request.sentence,
        user_level=current_user.english_level,
        article_context=article_context,
    )
