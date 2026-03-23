"""
AI 对话与句子拆解 API。
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.article import Article
from app.schemas.user import UserInfo
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


def build_article_context(article: Article, paragraph_index: int | None = None) -> dict[str, Any]:
    """构造课文上下文。"""
    paragraph_context: dict[str, Any] = {}
    if (
        paragraph_index is not None
        and article.content
        and 0 <= paragraph_index < len(article.content)
    ):
        paragraph = article.content[paragraph_index]
        paragraph_context = {
            "paragraph_en": paragraph.get("en"),
            "paragraph_zh": paragraph.get("zh"),
            "speaker": paragraph.get("speaker"),
        }

    return {
        "title": article.title,
        "level": article.level,
        "vocabulary": [item.get("word") for item in (article.vocabulary or [])][:5],
        "grammar": [item.get("point") for item in (article.grammar or [])][:2],
        "summary": article.content[0]["en"] if article.content else "",
        **paragraph_context,
    }


async def get_owned_article(
    db: AsyncSession,
    *,
    article_id: int,
    user_id: int,
) -> Article:
    """读取当前用户自己的文章。"""
    result = await db.execute(
        select(Article).where(Article.id == article_id).where(Article.user_id == user_id)
    )
    article = result.scalar_one_or_none()
    if article is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文章不存在",
        )
    return article


async def resolve_article_context(
    request: AIChatRequest,
    db: AsyncSession,
    current_user: UserInfo,
) -> dict[str, Any] | None:
    """解析课文上下文。"""
    article_context: dict[str, Any] | None = None
    if request.mode != "lesson":
        return article_context

    if request.article_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="课文对话模式需要 article_id",
        )

    article = await get_owned_article(db, article_id=request.article_id, user_id=current_user.id)
    return build_article_context(article)


@router.post("/respond", response_model=AIChatResponse, summary="获取 AI 对话回复")
async def respond_ai_chat(
    request: AIChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """根据课文上下文或通用问题返回 AI 回复。"""
    article_context = await resolve_article_context(request, db, current_user)
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
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> StreamingResponse:
    """流式返回 AI 回复。"""
    article_context = await resolve_article_context(request, db, current_user)

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
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> SentenceBreakdownResult:
    """对课文中的句子做结构化拆解。"""
    article_context: dict[str, Any] | None = None

    if request.article_id is not None:
        article = await get_owned_article(
            db, article_id=request.article_id, user_id=current_user.id
        )
        if request.paragraph_index is not None and (
            request.paragraph_index < 0 or request.paragraph_index >= len(article.content or [])
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="段落索引超出范围",
            )
        article_context = build_article_context(article, request.paragraph_index)

    return await sentence_helper_service.analyze(
        sentence=request.sentence,
        user_level=current_user.english_level,
        article_context=article_context,
    )
