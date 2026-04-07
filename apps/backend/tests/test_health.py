"""
健康检查测试。
"""

from __future__ import annotations

import json

import pytest
from fastapi.responses import JSONResponse

import app.main as main


@pytest.mark.anyio
async def test_health_check_returns_success(monkeypatch) -> None:
    async def fake_check_db_connection() -> None:
        return None

    async def fake_check_redis_connection() -> None:
        return None

    monkeypatch.setattr(main, "check_db_connection", fake_check_db_connection)
    monkeypatch.setattr(main, "check_redis_connection", fake_check_redis_connection)

    response = await main.health_check()

    assert response == {
        "status": "healthy",
        "checks": {"database": "ok", "redis": "ok"},
    }


@pytest.mark.anyio
async def test_health_check_returns_503_when_dependency_fails(monkeypatch) -> None:
    async def fake_check_db_connection() -> None:
        raise RuntimeError("db down")

    async def fake_check_redis_connection() -> None:
        return None

    monkeypatch.setattr(main, "check_db_connection", fake_check_db_connection)
    monkeypatch.setattr(main, "check_redis_connection", fake_check_redis_connection)

    response = await main.health_check()

    assert isinstance(response, JSONResponse)
    assert response.status_code == 503

    payload = json.loads(bytes(response.body))
    assert payload["status"] == "unhealthy"
    assert payload["checks"]["database"] == "error"
    assert payload["checks"]["redis"] == "ok"
