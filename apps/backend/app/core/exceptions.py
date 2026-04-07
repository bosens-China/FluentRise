"""
应用级业务异常定义。
"""

from __future__ import annotations


class AppError(Exception):
    """应用级异常基类。"""

    status_code = 500
    detail = "服务器内部错误"
    headers: dict[str, str] | None = None

    def __init__(
        self,
        detail: str | None = None,
        *,
        headers: dict[str, str] | None = None,
    ) -> None:
        self.detail = detail or self.detail
        self.headers = headers or self.headers
        super().__init__(self.detail)


class BadRequestError(AppError):
    status_code = 400
    detail = "请求参数不合法"


class UnauthorizedError(AppError):
    status_code = 401
    detail = "未授权"

    def __init__(self, detail: str | None = None) -> None:
        super().__init__(detail, headers={"WWW-Authenticate": "Bearer"})


class ForbiddenError(AppError):
    status_code = 403
    detail = "禁止访问"


class NotFoundError(AppError):
    status_code = 404
    detail = "资源不存在"


class ConflictError(AppError):
    status_code = 409
    detail = "资源状态冲突"


class TooManyRequestsError(AppError):
    status_code = 429
    detail = "请求过于频繁"


class ServiceUnavailableError(AppError):
    status_code = 503
    detail = "服务当前不可用"
