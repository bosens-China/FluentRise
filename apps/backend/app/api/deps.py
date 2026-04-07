"""
API 依赖注入。
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated, TypeAlias

from fastapi import Depends, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.core.security import decode_token
from app.db.database import get_db
from app.repositories.user_repository import get_user_by_id
from app.schemas.user import UserInfo

security = HTTPBearer(auto_error=False)


@dataclass(slots=True)
class PaginationParams:
    """通用分页参数。"""

    page: int
    page_size: int


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> UserInfo:
    """获取当前登录用户。"""
    if not credentials:
        raise UnauthorizedError("未提供认证凭证")

    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise UnauthorizedError("无效的认证凭证")

    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedError("无效的认证凭证")

    try:
        parsed_user_id = int(user_id)
    except (TypeError, ValueError) as exc:
        raise UnauthorizedError("无效的认证凭证") from exc

    user = await get_user_by_id(db, user_id=parsed_user_id)
    if user is None:
        raise UnauthorizedError("无效的认证凭证")

    if not user.is_active:
        raise ForbiddenError("用户已被禁用")

    return UserInfo.model_validate(user)


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> UserInfo | None:
    """可选登录依赖。"""
    try:
        return await get_current_user(credentials, db)
    except UnauthorizedError:
        return None


def get_standard_pagination(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
) -> PaginationParams:
    """默认分页参数。"""
    return PaginationParams(page=page, page_size=page_size)


def get_large_pagination(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginationParams:
    """较大页容量的分页参数。"""
    return PaginationParams(page=page, page_size=page_size)


DbSession: TypeAlias = Annotated[AsyncSession, Depends(get_db)]
CurrentUser: TypeAlias = Annotated[UserInfo, Depends(get_current_user)]
StandardPagination: TypeAlias = Annotated[PaginationParams, Depends(get_standard_pagination)]
LargePagination: TypeAlias = Annotated[PaginationParams, Depends(get_large_pagination)]
