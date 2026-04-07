"""
异常语义测试。
"""

from __future__ import annotations

from app.core.exceptions import UnauthorizedError


def test_unauthorized_error_includes_bearer_header() -> None:
    exc = UnauthorizedError("无效的认证凭证")

    assert exc.status_code == 401
    assert exc.headers == {"WWW-Authenticate": "Bearer"}
