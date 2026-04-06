"""
AI 对话上下文服务。
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestError, NotFoundError
from app.models.article import Article
from app.repositories.article_repository import get_user_article_by_id


def build_article_context(
    article: Article,
    paragraph_index: int | None = None,
) -> dict[str, Any]:
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


async def get_required_user_article(
    db: AsyncSession,
    *,
    article_id: int,
    user_id: int,
) -> Article:
    """获取当前用户拥有的文章。"""
    article = await get_user_article_by_id(db, user_id=user_id, article_id=article_id)
    if article is None:
        raise NotFoundError("文章不存在")
    return article


async def resolve_lesson_article_context(
    db: AsyncSession,
    *,
    user_id: int,
    article_id: int | None,
) -> dict[str, Any]:
    """解析课文对话上下文。"""
    if article_id is None:
        raise BadRequestError("课文对话模式需要 article_id")

    article = await get_required_user_article(db, article_id=article_id, user_id=user_id)
    return build_article_context(article)


async def resolve_sentence_breakdown_context(
    db: AsyncSession,
    *,
    user_id: int,
    article_id: int | None,
    paragraph_index: int | None,
) -> dict[str, Any] | None:
    """解析句子拆解所需的课文上下文。"""
    if article_id is None:
        return None

    article = await get_required_user_article(db, article_id=article_id, user_id=user_id)
    if paragraph_index is not None and (
        paragraph_index < 0 or paragraph_index >= len(article.content or [])
    ):
        raise BadRequestError("段落索引超出范围")

    return build_article_context(article, paragraph_index)
