from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.note import Note
from app.schemas.note import NoteCreate, NoteListResponse, NoteResponse, NoteUpdate
from app.schemas.user import UserInfo

router = APIRouter(prefix="/notes", tags=["笔记"])


@router.post("", response_model=NoteResponse)
async def create_note(
    note_in: NoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """创建笔记"""
    note = Note(
        user_id=current_user.id,
        article_id=note_in.article_id,
        title=note_in.title,
        content=note_in.content,
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return note


@router.get("", response_model=NoteListResponse)
async def get_notes(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    article_id: int | None = Query(None, description="按文章筛选"),
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """获取笔记列表"""
    offset = (page - 1) * page_size

    # 构建查询
    query = select(Note).where(Note.user_id == current_user.id)
    if article_id:
        query = query.where(Note.article_id == article_id)

    # 计算总数
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query) or 0

    # 获取列表 (预加载 article 以获取标题)
    query = (
        query.options(selectinload(Note.article))
        .order_by(desc(Note.created_at))
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(query)
    notes = result.scalars().all()

    # 构造响应，手动填充 article_title
    items = []
    for note in notes:
        item = NoteResponse.model_validate(note)
        if note.article:
            item.article_title = note.article.title
        items.append(item)

    return NoteListResponse(items=items, total=total)


@router.patch("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: int,
    note_in: NoteUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """更新笔记"""
    result = await db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == current_user.id)
    )
    note = result.scalar_one_or_none()

    if not note:
        raise HTTPException(status_code=404, detail="笔记不存在")

    if note_in.title is not None:
        note.title = note_in.title
    if note_in.content is not None:
        note.content = note_in.content

    await db.commit()
    await db.refresh(note)
    return note


@router.delete("/{note_id}")
async def delete_note(
    note_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """删除笔记"""
    result = await db.execute(
        select(Note).where(Note.id == note_id, Note.user_id == current_user.id)
    )
    note = result.scalar_one_or_none()

    if not note:
        raise HTTPException(status_code=404, detail="笔记不存在")

    await db.delete(note)
    await db.commit()
    return {"success": True}
