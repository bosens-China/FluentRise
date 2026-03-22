"""
错题本服务
"""

from __future__ import annotations

import re
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mistake_book import MistakeBookEntry

WORD_PATTERN = re.compile(r"[A-Za-z]+(?:['-][A-Za-z]+)?")


def infer_mistake_item_type(target_text: str) -> str:
    """根据目标答案粗略判断更适合的错题类型。"""
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
        """记录一条错题。"""
        result = await db.execute(
            select(MistakeBookEntry).where(
                MistakeBookEntry.user_id == user_id,
                MistakeBookEntry.item_type == item_type,
                MistakeBookEntry.target_text == target_text,
            )
        )
        entry = result.scalar_one_or_none()
        now = datetime.now(UTC)

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
        """标记用户在某条错题上完成了一次纠正。"""
        result = await db.execute(
            select(MistakeBookEntry).where(
                MistakeBookEntry.user_id == user_id,
                MistakeBookEntry.item_type == item_type,
                MistakeBookEntry.target_text == target_text,
            )
        )
        entry = result.scalar_one_or_none()
        if entry is None:
            return

        entry.correct_count += 1
        entry.last_corrected_at = datetime.now(UTC)
        if entry.correct_count >= 2 and entry.correct_count >= entry.mistake_count:
            entry.is_mastered = True

    @staticmethod
    async def list_entries(db: AsyncSession, user_id: int) -> list[MistakeBookEntry]:
        """获取用户错题本。"""
        result = await db.execute(
            select(MistakeBookEntry)
            .where(MistakeBookEntry.user_id == user_id)
            .order_by(
                MistakeBookEntry.is_mastered.asc(),
                desc(MistakeBookEntry.last_seen_at),
                desc(MistakeBookEntry.mistake_count),
            )
        )
        return list(result.scalars().all())


mistake_service = MistakeService()
