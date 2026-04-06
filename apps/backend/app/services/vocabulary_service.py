"""
生词本服务。
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.vocabulary_repository import list_user_vocabulary_entries_with_article
from app.schemas.vocabulary import TimelineGroup, VocabularyResponse, VocabularyTimelineResponse


async def get_vocabulary_timeline_response(
    db: AsyncSession,
    *,
    user_id: int,
) -> VocabularyTimelineResponse:
    """获取按时间线分组的生词本响应。"""
    vocabularies = await list_user_vocabulary_entries_with_article(db, user_id=user_id)

    groups: dict[str, list[VocabularyResponse]] = {}
    for vocab in vocabularies:
        date_str = vocab.created_at.strftime("%Y-%m-%d")
        groups.setdefault(date_str, [])

        item = VocabularyResponse.model_validate(vocab)
        item.article_title = vocab.article.title if vocab.article else None
        groups[date_str].append(item)

    timeline = [TimelineGroup(date=date_str, words=words) for date_str, words in groups.items()]
    timeline.sort(key=lambda item: item.date, reverse=True)
    return VocabularyTimelineResponse(timeline=timeline, total=len(vocabularies))
