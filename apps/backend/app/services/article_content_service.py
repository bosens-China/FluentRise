"""
文章读取与音频内容服务。
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, ServiceUnavailableError
from app.models.article import Article
from app.repositories.article_repository import get_user_article_by_id
from app.schemas.article import (
    ArticleAudioTimelineResponse,
    ArticleContent,
    BilingualContent,
    CultureTip,
    Exercise,
    GrammarPoint,
    VocabularyWord,
)
from app.services.tts_service import tts_service


async def get_user_article(
    db: AsyncSession,
    *,
    user_id: int,
    article_id: int,
) -> Article:
    """获取用户自己的文章记录。"""
    article = await get_user_article_by_id(db, user_id=user_id, article_id=article_id)
    if article is None:
        raise NotFoundError("文章不存在")
    return article


def build_article_content(article: Article) -> ArticleContent:
    """将 ORM 文章记录转换为结构化内容。"""
    return ArticleContent(
        title=article.title,
        level=article.level,
        source_book=article.source_book,
        source_lesson=article.source_lesson,
        vocabulary=[VocabularyWord(**item) for item in (article.vocabulary or [])],
        content=[BilingualContent(**item) for item in (article.content or [])],
        grammar=[GrammarPoint(**item) for item in (article.grammar or [])],
        tips=[CultureTip(**item) for item in (article.tips or [])],
        exercises=[Exercise(**item) for item in (article.exercises or [])],
    )


async def generate_article_audio_bytes(
    db: AsyncSession,
    *,
    user_id: int,
    article_id: int,
) -> bytes:
    """生成整篇文章音频字节流。"""
    article = await get_user_article(db, user_id=user_id, article_id=article_id)
    article_content = build_article_content(article)

    try:
        return await tts_service.generate_article_audio_bytes(article_content, article_id)
    except ImportError as exc:
        raise ServiceUnavailableError("TTS 服务当前不可用") from exc


async def get_article_audio_timeline(
    db: AsyncSession,
    *,
    user_id: int,
    article_id: int,
) -> ArticleAudioTimelineResponse:
    """获取文章整篇音频时间轴。"""
    article = await get_user_article(db, user_id=user_id, article_id=article_id)
    article_content = build_article_content(article)

    try:
        timeline = await tts_service.get_article_audio_timeline(article_content, article_id)
    except ImportError as exc:
        raise ServiceUnavailableError("TTS 服务当前不可用") from exc

    return ArticleAudioTimelineResponse.model_validate({"segments": timeline})
