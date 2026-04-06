"""
通用分页响应模型。
"""

from __future__ import annotations

from typing import Generic, TypeVar

from pydantic import BaseModel

ItemT = TypeVar("ItemT")


class PaginatedItemsResponse(BaseModel, Generic[ItemT]):
    """通用 items + total 分页响应。"""

    items: list[ItemT]
    total: int
