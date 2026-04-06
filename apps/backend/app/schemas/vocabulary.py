"""
生词本响应模型。
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class VocabularyResponse(BaseModel):
    id: int
    word: str
    uk_phonetic: str | None
    us_phonetic: str | None
    meaning: str
    article_id: int | None
    article_title: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TimelineGroup(BaseModel):
    date: str = Field(..., description="日期，格式 YYYY-MM-DD")
    words: list[VocabularyResponse]


class VocabularyTimelineResponse(BaseModel):
    timeline: list[TimelineGroup]
    total: int
