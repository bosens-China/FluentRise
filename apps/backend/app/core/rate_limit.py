"""
统一的认证接口限流配置。
"""

from inspect import isawaitable

from fastapi import HTTPException, Request, Response
from fastapi_limiter.depends import RateLimiter
from pyrate_limiter import Duration, Limiter, Rate
from pyrate_limiter.buckets.redis_bucket import RedisBucket
from redis.asyncio import Redis
from starlette.status import HTTP_429_TOO_MANY_REQUESTS

_LIMITERS: dict[str, Limiter] = {}


async def _build_limiter(redis_client: Redis, bucket_key: str, rates: list[Rate]) -> Limiter:
    bucket_or_awaitable = RedisBucket.init(rates, redis_client, bucket_key)
    bucket = await bucket_or_awaitable if isawaitable(bucket_or_awaitable) else bucket_or_awaitable
    return Limiter(bucket)


async def init_rate_limiters(redis_client: Redis) -> None:
    """初始化认证相关限流器。"""
    _LIMITERS["auth_sms_send"] = await _build_limiter(
        redis_client,
        "rate:auth:sms_send",
        [Rate(1, Duration.MINUTE), Rate(5, Duration.MINUTE * 10)],
    )
    _LIMITERS["auth_login_phone"] = await _build_limiter(
        redis_client,
        "rate:auth:login_phone",
        [Rate(5, Duration.MINUTE * 5), Rate(20, Duration.HOUR)],
    )
    _LIMITERS["auth_refresh"] = await _build_limiter(
        redis_client,
        "rate:auth:refresh",
        [Rate(12, Duration.MINUTE), Rate(60, Duration.HOUR)],
    )


def _get_limiter(name: str) -> Limiter:
    limiter = _LIMITERS.get(name)
    if limiter is None:
        raise RuntimeError(f"限流器尚未初始化: {name}")
    return limiter


async def _rate_limit_callback(request: Request, response: Response) -> None:
    raise HTTPException(
        status_code=HTTP_429_TOO_MANY_REQUESTS,
        detail="请求过于频繁，请稍后再试",
    )


async def auth_sms_send_rate_limit(request: Request, response: Response) -> None:
    limiter = RateLimiter(
        limiter=_get_limiter("auth_sms_send"),
        callback=_rate_limit_callback,
    )
    await limiter(request, response)


async def auth_login_phone_rate_limit(request: Request, response: Response) -> None:
    limiter = RateLimiter(
        limiter=_get_limiter("auth_login_phone"),
        callback=_rate_limit_callback,
    )
    await limiter(request, response)


async def auth_refresh_rate_limit(request: Request, response: Response) -> None:
    limiter = RateLimiter(
        limiter=_get_limiter("auth_refresh"),
        callback=_rate_limit_callback,
    )
    await limiter(request, response)
