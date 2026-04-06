"""
LLM 工厂。
"""

from __future__ import annotations

from langchain_openai import ChatOpenAI
from pydantic import SecretStr

from app.core.config import settings


def build_chat_model(*, temperature: float = 0.5) -> ChatOpenAI:
    """构建统一配置的快速 OpenAI 模型 (Fast Model)。"""
    return ChatOpenAI(
        model=settings.OPENAI_FAST_MODEL,
        api_key=SecretStr(settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None,
        base_url=settings.OPENAI_BASE_URL,
        temperature=temperature,
    )


def build_smart_model() -> ChatOpenAI:
    """构建高智商推理模型 (Smart Model, e.g. o3-mini)。"""
    return ChatOpenAI(
        model=settings.OPENAI_SMART_MODEL,
        api_key=SecretStr(settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None,
        base_url=settings.OPENAI_BASE_URL,
    )
