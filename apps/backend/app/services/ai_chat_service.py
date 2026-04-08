"""
AI 对话服务。
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from typing import Any

from langchain_core.prompts import ChatPromptTemplate

from app.core.config import settings
from app.services.llm_factory import build_chat_model

logger = logging.getLogger(__name__)


class AIChatService:
    """课文对话与通用求助服务。"""

    def __init__(self) -> None:
        self.enabled = bool(settings.OPENAI_API_KEY)
        self.llm = build_chat_model(temperature=0.5)

    def _build_prompt(
        self,
        *,
        mode: str,
        message: str,
        user_level: int | None,
        learning_goals: list[str] | None,
        article_context: dict[str, Any] | None,
    ) -> ChatPromptTemplate:
        goal_text = "、".join(learning_goals or []) or "日常交流"
        return ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "你是专注、专业的英语学习助教。请用简洁的中文回答，必要时提供英语示例。\n"
                    "【严格的边界限制】：你只能解答与“英语学习”、“当前课文内容”、“当课单词或语法”相关的问题。\n"
                    "如果用户询问与英语学习或当前课文无关的任何问题（例如：写代码、聊天气、问菜谱、问新闻等），"
                    "你必须委婉地拒绝，并主动将话题拉回英语学习或当前课文上。\n"
                    "优先使用短段落输出，避免长篇大论。",
                ),
                (
                    "user",
                    "模式: {mode}\n"
                    "用户等级: {user_level}\n"
                    "学习目标: {goal_text}\n"
                    "课文上下文: {article_context}\n"
                    "用户消息: {message}\n"
                    "请根据上述要求，给出专注、简洁的回复。",
                ),
            ]
        ).partial(
            mode=mode,
            user_level=user_level if user_level is not None else "未评测",
            goal_text=goal_text,
            article_context=article_context or "无",
            message=message,
        )

    @staticmethod
    def _extract_chunk_text(chunk: object) -> str:
        content: Any = getattr(chunk, "content", "")

        if isinstance(content, str):
            return content

        if isinstance(content, list):
            parts: list[str] = []
            for item in content:
                if isinstance(item, str):
                    parts.append(item)
                    continue
                if isinstance(item, dict):
                    text = item.get("text")
                    if isinstance(text, str):
                        parts.append(text)
            return "".join(parts)

        return ""

    async def reply(
        self,
        *,
        mode: str,
        message: str,
        user_level: int | None,
        learning_goals: list[str] | None,
        article_context: dict[str, Any] | None = None,
    ) -> str:
        """生成完整对话回复。"""
        if not self.enabled:
            return self._fallback(mode, article_context)

        prompt = self._build_prompt(
            mode=mode,
            message=message,
            user_level=user_level,
            learning_goals=learning_goals,
            article_context=article_context,
        )

        try:
            chain = prompt | self.llm
            response = await chain.ainvoke({})
            content = self._extract_chunk_text(response)
            if content.strip():
                return content.strip()
        except Exception:
            logger.warning("AI 对话回复生成失败", exc_info=True)

        return self._fallback(mode, article_context)

    async def stream_reply(
        self,
        *,
        mode: str,
        message: str,
        user_level: int | None,
        learning_goals: list[str] | None,
        article_context: dict[str, Any] | None = None,
    ) -> AsyncIterator[str]:
        """流式生成对话回复。"""
        if not self.enabled:
            yield self._fallback(mode, article_context)
            return

        prompt = self._build_prompt(
            mode=mode,
            message=message,
            user_level=user_level,
            learning_goals=learning_goals,
            article_context=article_context,
        )

        try:
            chain = prompt | self.llm
            has_output = False
            async for chunk in chain.astream({}):
                text = self._extract_chunk_text(chunk)
                if not text:
                    continue
                has_output = True
                yield text

            if has_output:
                return
        except Exception:
            logger.warning("AI 对话流式回复生成失败", exc_info=True)

        yield self._fallback(mode, article_context)

    @staticmethod
    def _fallback(mode: str, article_context: dict[str, Any] | None) -> str:
        """模型不可用时的兜底回复。"""
        if mode == "lesson" and article_context:
            title = article_context.get("title", "今天这节课")
            return (
                f"我们可以围绕《{title}》继续练习。你先试着用一句简单英文复述内容，我来帮你润色。"
            )
        return "你可以直接把想表达的中文或英文发给我，我会尽量用简单清楚的方式帮你整理。"


ai_chat_service = AIChatService()
