"""
系统相关 API。
"""

from __future__ import annotations

import random
from typing import Any

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.system import EncouragementRequest, Quote, SystemConfigResponse
from app.services.encouragement_service import EncouragementResult, encouragement_service
from app.services.study_log_service import study_log_service
from app.services.system_config_service import system_config_service

router = APIRouter(prefix="/system", tags=["系统"])


ENCOURAGING_QUOTES = [
    {
        "en": "A little progress each day adds up to big results.",
        "zh": "每天进步一点点，慢慢就会变成很大的成果。",
    },
    {"en": "You are doing better than you think.", "zh": "你比自己想象中做得更好。"},
    {"en": "Small steps still move you forward.", "zh": "哪怕步子小，也是在向前走。"},
    {
        "en": "Learning grows quietly, then suddenly feels natural.",
        "zh": "学习常常是悄悄积累，然后忽然变得顺手。",
    },
    {
        "en": "Your effort today is building tomorrow's confidence.",
        "zh": "你今天的努力，正在变成明天的底气。",
    },
    {
        "en": "Consistency makes hard things feel easy later.",
        "zh": "稳定坚持，会让原本困难的事慢慢变轻松。",
    },
    {"en": "You are closer than yesterday.", "zh": "你已经比昨天更近一步了。"},
    {
        "en": "Keep your own pace. It still counts.",
        "zh": "按自己的节奏来也很好，这样的前进同样算数。",
    },
]


@router.get("/config", response_model=SystemConfigResponse, summary="获取系统能力配置")
async def get_system_config() -> SystemConfigResponse:
    """返回前端可消费的系统能力与限制配置。"""
    return system_config_service.get_config()


@router.get("/quotes", response_model=list[Quote], summary="获取鼓励语录")
async def get_quotes(count: int = 5) -> list[Quote]:
    """随机获取鼓励语录。"""
    actual_count = min(max(count, 1), len(ENCOURAGING_QUOTES))
    return [Quote.model_validate(item) for item in random.sample(ENCOURAGING_QUOTES, actual_count)]


@router.post("/encouragement", response_model=EncouragementResult, summary="生成鼓励文案")
async def generate_encouragement(
    request: EncouragementRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> Any:
    """生成中英文鼓励文案。"""
    streak_days = request.streak_days
    if streak_days is None:
        streak_data = await study_log_service.get_streak(db, current_user.id)
        streak_days = streak_data.streak_days

    return await encouragement_service.generate(
        context_type=request.context_type,
        user_level=current_user.english_level,
        title=request.title,
        accuracy=request.accuracy,
        streak_days=streak_days,
    )
