"""
笔记相关 Pydantic 模式
"""

from datetime import datetime

from pydantic import BaseModel, Field


class NoteBase(BaseModel):
    """笔记基础模型"""

    title: str | None = Field(None, description="笔记标题")
    content: str = Field(..., description="笔记内容")
    article_id: int | None = Field(None, description="关联的文章ID")


class NoteCreate(NoteBase):
    """创建笔记请求"""

    pass


class NoteUpdate(BaseModel):
    """更新笔记请求"""

    title: str | None = Field(None, description="笔记标题")
    content: str | None = Field(None, description="笔记内容")


class NoteResponse(NoteBase):
    """笔记响应"""

    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    article_title: str | None = Field(None, description="关联文章标题(用于列表展示)")

    model_config = {"from_attributes": True}


class NoteListResponse(BaseModel):
    """笔记列表响应"""

    items: list[NoteResponse]
    total: int
