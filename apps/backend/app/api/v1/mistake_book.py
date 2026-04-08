"""
错题本 API
"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.mistake_book import MistakeBookItem, MistakeBookResponse
from app.services.mistake_service import mistake_service

router = APIRouter(prefix="/mistakes", tags=["错题本"])


@router.get("", response_model=MistakeBookResponse, summary="获取错题本")
async def get_mistake_book(
    db: DbSession,
    current_user: CurrentUser,
) -> MistakeBookResponse:
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
