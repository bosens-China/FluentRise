"""
LLM 公共工厂
"""

from __future__ import annotations

from langchain_openai import ChatOpenAI
from pydantic import SecretStr

from app.core.config import settings


def build_chat_model(*, temperature: float) -> ChatOpenAI:
    """构建统一配置的聊天模型"""
    return ChatOpenAI(
        model=settings.OPENAI_MODEL,
        api_key=SecretStr(settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None,
        base_url=settings.OPENAI_BASE_URL,
        temperature=temperature,
    )
