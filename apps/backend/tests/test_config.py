"""
配置相关测试。
"""

from __future__ import annotations

import pytest

from app.core.config import Settings


def test_development_defaults_are_safe(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("ENABLE_DOCS", raising=False)
    monkeypatch.delenv("ENABLE_OPENAPI", raising=False)
    monkeypatch.delenv("DEBUG", raising=False)
    settings = Settings()

    assert settings.DEBUG is False
    assert settings.ENABLE_DOCS is True
    assert settings.ENABLE_OPENAPI is True


def test_production_requires_secure_secret() -> None:
    with pytest.raises(ValueError, match="SECRET_KEY"):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="CHANGE_ME_IN_ENV",
        )
