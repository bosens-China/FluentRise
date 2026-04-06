"""
笔记服务。
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.note import Note
from app.repositories.note_repository import count_user_notes, get_user_note_by_id, list_user_notes
from app.schemas.note import NoteCreate, NoteListResponse, NoteResponse, NoteUpdate


class NoteService:
    """笔记服务。"""

    @staticmethod
    async def create(*, db: AsyncSession, user_id: int, obj: NoteCreate) -> Note:
        note = Note(
            user_id=user_id,
            article_id=obj.article_id,
            title=obj.title,
            content=obj.content,
        )
        db.add(note)
        await db.commit()
        await db.refresh(note)
        return note

    @staticmethod
    async def get_list(
        *,
        db: AsyncSession,
        user_id: int,
        page: int,
        page_size: int,
        article_id: int | None,
    ) -> NoteListResponse:
        offset = (page - 1) * page_size
        total = await count_user_notes(db, user_id=user_id, article_id=article_id)
        notes = await list_user_notes(
            db,
            user_id=user_id,
            offset=offset,
            limit=page_size,
            article_id=article_id,
        )

        items: list[NoteResponse] = []
        for note in notes:
            item = NoteResponse.model_validate(note)
            if note.article:
                item.article_title = note.article.title
            items.append(item)

        return NoteListResponse(items=items, total=total)

    @staticmethod
    async def update(*, db: AsyncSession, user_id: int, note_id: int, obj: NoteUpdate) -> Note:
        note = await NoteService.get_owned_note(db=db, user_id=user_id, note_id=note_id)

        if obj.title is not None:
            note.title = obj.title
        if obj.content is not None:
            note.content = obj.content

        await db.commit()
        await db.refresh(note)
        return note

    @staticmethod
    async def delete(*, db: AsyncSession, user_id: int, note_id: int) -> None:
        note = await NoteService.get_owned_note(db=db, user_id=user_id, note_id=note_id)
        await db.delete(note)
        await db.commit()

    @staticmethod
    async def get_owned_note(*, db: AsyncSession, user_id: int, note_id: int) -> Note:
        note = await get_user_note_by_id(db, user_id=user_id, note_id=note_id)
        if note is None:
            raise NotFoundError("笔记不存在")
        return note


note_service = NoteService()
