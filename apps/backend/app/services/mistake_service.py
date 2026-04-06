"""
错题服务。
"""

from __future__ import annotations

import re
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.time import utc_now
from app.models.mistake_book import MistakeBookEntry
from app.repositories.mistake_book_repository import (
    get_user_mistake_entry,
    list_user_mistake_entries,
)

WORD_PATTERN = re.compile(r"[A-Za-z]+(?:['-][A-Za-z]+)?")


def infer_mistake_item_type(target_text: str) -> str:
    """根据目标答案粗略判断错题类型。"""
    normalized = target_text.strip()
    if not normalized:
        return "exercise"

    tokens = WORD_PATTERN.findall(normalized)
    if len(tokens) >= 2 or " " in normalized:
        return "sentence"
    return "word"


class MistakeService:
    """错题记录与查询服务。"""

    @staticmethod
    async def record_mistake(
        db: AsyncSession,
        *,
        user_id: int,
        source_type: str,
        item_type: str,
        target_text: str,
        prompt_text: str | None = None,
        user_answer: str | None = None,
        context_text: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> MistakeBookEntry:
        """记录错题。"""
        entry = await get_user_mistake_entry(
            db,
            user_id=user_id,
            item_type=item_type,
            target_text=target_text,
        )
        now = utc_now()

        if entry is None:
            entry = MistakeBookEntry(
                user_id=user_id,
                source_type=source_type,
                item_type=item_type,
                target_text=target_text,
                prompt_text=prompt_text,
                last_user_answer=user_answer,
                context_text=context_text,
                payload=metadata,
                mistake_count=1,
                correct_count=0,
                is_mastered=False,
                first_seen_at=now,
                last_seen_at=now,
            )
            db.add(entry)
        else:
            entry.source_type = source_type
            entry.prompt_text = prompt_text or entry.prompt_text
            entry.last_user_answer = user_answer
            entry.context_text = context_text or entry.context_text
            entry.payload = metadata or entry.payload
            entry.mistake_count += 1
            entry.is_mastered = False
            entry.last_seen_at = now

        await db.flush()
        return entry

    @staticmethod
    async def mark_mastered(
        db: AsyncSession,
        *,
        user_id: int,
        item_type: str,
        target_text: str,
    ) -> None:
        """记录一次纠正行为。"""
        entry = await get_user_mistake_entry(
            db,
            user_id=user_id,
            item_type=item_type,
            target_text=target_text,
        )
        if entry is None:
            return

        entry.correct_count += 1
        entry.last_corrected_at = utc_now()
        if entry.correct_count >= 2 and entry.correct_count >= entry.mistake_count:
            entry.is_mastered = True

    @staticmethod
    async def list_entries(db: AsyncSession, user_id: int) -> list[MistakeBookEntry]:
        """获取错题列表。"""
        return await list_user_mistake_entries(db, user_id=user_id)


mistake_service = MistakeService()
