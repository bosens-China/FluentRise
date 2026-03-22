"""
错题本 API
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.schemas.user import UserInfo
from app.services.mistake_service import mistake_service

router = APIRouter(prefix="/mistakes", tags=["错题本"])


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


@router.get("", response_model=MistakeBookResponse, summary="获取错题本")
async def get_mistake_book(
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """返回当前用户的错题本条目。"""
    entries = await mistake_service.list_entries(db, current_user.id)
    items = [
        MistakeBookItem(
            id=entry.id,
            source_type=entry.source_type,
            item_type=entry.item_type,
            target_text=entry.target_text,
            prompt_text=entry.prompt_text,
            last_user_answer=entry.last_user_answer,
            context_text=entry.context_text,
            payload=entry.payload,
            mistake_count=entry.mistake_count,
            correct_count=entry.correct_count,
            is_mastered=entry.is_mastered,
            first_seen_at=entry.first_seen_at,
            last_seen_at=entry.last_seen_at,
            last_corrected_at=entry.last_corrected_at,
        )
        for entry in entries
    ]
    pending_total = sum(1 for item in items if not item.is_mastered)
    mastered_total = len(items) - pending_total
    return MistakeBookResponse(
        items=items,
        total=len(items),
        pending_total=pending_total,
        mastered_total=mastered_total,
    )
