"""
笔记相关路由。
"""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.api.deps import CurrentUser, DbSession, LargePagination
from app.schemas.note import NoteCreate, NoteListResponse, NoteResponse, NoteUpdate
from app.schemas.user import MessageResponse
from app.services.note_service import note_service

router = APIRouter(prefix="/notes", tags=["笔记"])


@router.post("", response_model=NoteResponse, summary="创建笔记")
async def create_note(
    note_in: NoteCreate,
    db: DbSession,
    current_user: CurrentUser,
) -> NoteResponse:
    note = await note_service.create(db=db, user_id=current_user.id, obj=note_in)
    return NoteResponse.model_validate(note)


@router.get("", response_model=NoteListResponse, summary="获取笔记列表")
async def get_notes(
    pagination: LargePagination,
    db: DbSession,
    current_user: CurrentUser,
    article_id: int | None = Query(None, description="按文章筛选"),
) -> NoteListResponse:
    return await note_service.get_list(
        db=db,
        user_id=current_user.id,
        page=pagination.page,
        page_size=pagination.page_size,
        article_id=article_id,
    )


@router.patch("/{note_id}", response_model=NoteResponse, summary="更新笔记")
async def update_note(
    note_id: int,
    note_in: NoteUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> NoteResponse:
    note = await note_service.update(
        db=db,
        user_id=current_user.id,
        note_id=note_id,
        obj=note_in,
    )
    return NoteResponse.model_validate(note)


@router.delete("/{note_id}", response_model=MessageResponse, summary="删除笔记")
async def delete_note(
    note_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> MessageResponse:
    await note_service.delete(db=db, user_id=current_user.id, note_id=note_id)
    return MessageResponse(message="笔记删除成功")
