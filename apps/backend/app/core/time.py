"""
统一时间工具。

存储层统一使用带时区的时间对象，业务“今天”的判断使用上海时区。
"""

from __future__ import annotations

from datetime import UTC, date, datetime, time
from zoneinfo import ZoneInfo

from app.core.config import settings


def app_timezone() -> ZoneInfo:
    """返回应用配置的业务时区。"""
    return ZoneInfo(settings.APP_TIMEZONE)


def app_now() -> datetime:
    """返回当前业务时区时间。"""
    return datetime.now(app_timezone())


def app_today() -> date:
    """返回当前业务时区日期。"""
    return app_now().date()


def app_day_bounds(target_date: date | None = None) -> tuple[datetime, datetime]:
    """返回业务时区某一天的起止时间。"""
    current_date = target_date or app_today()
    tz = app_timezone()
    return (
        datetime.combine(current_date, time.min, tzinfo=tz),
        datetime.combine(current_date, time.max, tzinfo=tz),
    )


def utc_now() -> datetime:
    """返回当前 UTC 时间。"""
    return datetime.now(UTC)
