"""
Redis 连接管理
"""

import redis.asyncio as redis

from app.core.config import settings

# Redis 连接池
redis_pool: redis.Redis | None = None


async def init_redis() -> None:
    """初始化 Redis 连接"""
    global redis_pool
    redis_pool = redis.from_url(
        settings.REDIS_URL,
        encoding="utf-8",
        decode_responses=True,
    )


async def close_redis() -> None:
    """关闭 Redis 连接"""
    global redis_pool
    if redis_pool:
        await redis_pool.close()


async def get_redis() -> redis.Redis:
    """获取 Redis 连接"""
    global redis_pool
    if redis_pool is None:
        await init_redis()
    assert redis_pool is not None
    return redis_pool


# 验证码相关的 Redis 操作
async def set_sms_code(phone: str, code: str, expire: int = 300) -> None:
    """存储验证码到 Redis"""
    r = await get_redis()
    key = f"sms:code:{phone}"
    await r.setex(key, expire, code)


async def get_sms_code(phone: str) -> str | None:
    """从 Redis 获取验证码"""
    r = await get_redis()
    key = f"sms:code:{phone}"
    result: str | None = await r.get(key)
    return result


async def delete_sms_code(phone: str) -> None:
    """删除验证码"""
    r = await get_redis()
    key = f"sms:code:{phone}"
    await r.delete(key)


async def is_code_sent_recently(phone: str, interval: int = 60) -> bool:
    """检查是否 recently 发送过验证码（防刷）"""
    r = await get_redis()
    key = f"sms:sent:{phone}"
    exists = await r.exists(key)
    if not exists:
        await r.setex(key, interval, "1")
        return False
    return True
