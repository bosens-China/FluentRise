from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class ArticleProposalBase(BaseModel):
    title: str
    description: str | None = None
    level: int
    order_index: int


class ArticleProposalResponse(ArticleProposalBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    status: str
    article_id: int | None = None
    created_at: datetime


class LearningPathResponse(BaseModel):
    completed_articles: list[dict[str, Any]]
    proposals: list[ArticleProposalResponse]
    current_level: int
    total_vocab_count: int
