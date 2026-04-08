"""
错题本相关 Schema。
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class MistakeBookItem(BaseModel):
    id: int
    source_type: str
    item_type: str
    target_text: str
    prompt_text: str | None
    last_user_answer: str | None
    context_text: str | None
    payload: dict[str, Any] | None
    mistake_count: int
    correct_count: int
    is_mastered: bool
    first_seen_at: datetime
    last_seen_at: datetime
    last_corrected_at: datetime | None


class MistakeBookResponse(BaseModel):
    items: list[MistakeBookItem]
    total: int
    pending_total: int = Field(..., description="未掌握题目数")
    mastered_total: int = Field(..., description="已掌握题目数")
