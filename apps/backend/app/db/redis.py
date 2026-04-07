"""
Redis 连接与缓存工具。
"""

from __future__ import annotations

from inspect import isawaitable

import redis.asyncio as redis

from app.core.config import settings

redis_pool: redis.Redis | None = None


async def init_redis() -> None:
    """初始化 Redis 连接。"""
    global redis_pool
    redis_pool = redis.from_url(
        settings.REDIS_URL,
        encoding="utf-8",
        decode_responses=True,
    )


async def close_redis() -> None:
    """关闭 Redis 连接。"""
    global redis_pool
    if redis_pool:
        await redis_pool.close()


async def get_redis() -> redis.Redis:
    """获取 Redis 客户端。"""
    global redis_pool
    if redis_pool is None:
        await init_redis()
    assert redis_pool is not None
    return redis_pool


async def check_redis_connection() -> None:
    """检查 Redis 连通性。"""
    redis_client = await get_redis()
    result = redis_client.ping()
    if isawaitable(result):
        await result


def _sms_code_key(phone: str) -> str:
    return f"sms:code:{phone}"


def _sms_sent_key(phone: str) -> str:
    return f"sms:sent:{phone}"


def _refresh_token_key(token_id: str) -> str:
    return f"auth:refresh:{token_id}"


async def set_sms_code(phone: str, code: str, expire: int = 300) -> None:
    """保存短信验证码。"""
    redis_client = await get_redis()
    await redis_client.setex(_sms_code_key(phone), expire, code)


async def get_sms_code(phone: str) -> str | None:
    """读取短信验证码。"""
    redis_client = await get_redis()
    result: str | None = await redis_client.get(_sms_code_key(phone))
    return result


async def delete_sms_code(phone: str) -> None:
    """删除短信验证码。"""
    redis_client = await get_redis()
    await redis_client.delete(_sms_code_key(phone))


async def is_code_sent_recently(phone: str, interval: int = 60) -> bool:
    """检查短时间内是否已发送过验证码。"""
    redis_client = await get_redis()
    exists = await redis_client.exists(_sms_sent_key(phone))
    if not exists:
        await redis_client.setex(_sms_sent_key(phone), interval, "1")
        return False
    return True


async def store_refresh_token(token_id: str, user_id: int, expire_seconds: int) -> None:
    """登记有效刷新令牌。"""
    redis_client = await get_redis()
    await redis_client.setex(_refresh_token_key(token_id), expire_seconds, str(user_id))


async def get_refresh_token_owner(token_id: str) -> str | None:
    """获取刷新令牌所属用户。"""
    redis_client = await get_redis()
    result: str | None = await redis_client.get(_refresh_token_key(token_id))
    return result


async def revoke_refresh_token(token_id: str) -> None:
    """撤销刷新令牌。"""
    redis_client = await get_redis()
    await redis_client.delete(_refresh_token_key(token_id))
