"""
笔记相关数据模型。
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.pagination import PaginatedItemsResponse


class NoteBase(BaseModel):
    """笔记基础模型。"""

    title: str | None = Field(None, description="笔记标题")
    content: str = Field(..., description="笔记内容")
    article_id: int | None = Field(None, description="关联文章 ID")


class NoteCreate(NoteBase):
    """创建笔记请求。"""


class NoteUpdate(BaseModel):
    """更新笔记请求。"""

    title: str | None = Field(None, description="笔记标题")
    content: str | None = Field(None, description="笔记内容")


class NoteResponse(NoteBase):
    """笔记响应。"""

    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    article_title: str | None = Field(None, description="关联文章标题")

    model_config = {"from_attributes": True}


class NoteListResponse(PaginatedItemsResponse[NoteResponse]):
    """笔记列表响应。"""
