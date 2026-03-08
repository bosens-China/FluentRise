"""
生词 API 路由
"""

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.vocabulary import Vocabulary
from app.schemas.user import UserInfo

router = APIRouter(prefix="/vocabularies", tags=["生词本"])


class VocabularyResponse(BaseModel):
    id: int
    word: str
    uk_phonetic: str | None
    us_phonetic: str | None
    meaning: str
    article_id: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class TimelineGroup(BaseModel):
    date: str = Field(..., description="日期，格式 YYYY-MM-DD")
    words: list[VocabularyResponse]


class VocabularyTimelineResponse(BaseModel):
    timeline: list[TimelineGroup]
    total: int


@router.get("/timeline", response_model=VocabularyTimelineResponse)
async def get_vocabulary_timeline(
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """
    获取用户的生词本（按时间线排列）
    """
    result = await db.execute(
        select(Vocabulary)
        .where(Vocabulary.user_id == current_user.id)
        .order_by(desc(Vocabulary.created_at), desc(Vocabulary.id))
    )
    vocabularies = result.scalars().all()

    # 按日期分组
    groups = {}
    for vocab in vocabularies:
        date_str = vocab.created_at.strftime("%Y-%m-%d")
        if date_str not in groups:
            groups[date_str] = []
        groups[date_str].append(VocabularyResponse.model_validate(vocab))

    timeline = [TimelineGroup(date=date_str, words=words) for date_str, words in groups.items()]

    # 保证按日期倒序
    timeline.sort(key=lambda x: x.date, reverse=True)

    return VocabularyTimelineResponse(timeline=timeline, total=len(vocabularies))
