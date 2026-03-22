"""
AI 对话服务
"""

from __future__ import annotations

from typing import Any

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import SecretStr

from app.core.config import settings


class AIChatService:
    """课文对话与通用求助服务。"""

    def __init__(self) -> None:
        self.enabled = bool(settings.OPENAI_API_KEY)
        self.llm = ChatOpenAI(
            model=settings.OPENAI_MODEL,
            api_key=SecretStr(settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None,
            base_url=settings.OPENAI_BASE_URL,
            temperature=0.5,
        )

    async def reply(
        self,
        *,
        mode: str,
        message: str,
        user_level: int | None,
        learning_goals: list[str] | None,
        article_context: dict[str, Any] | None = None,
    ) -> str:
        """生成对话回复。"""
        if not self.enabled:
            return self._fallback(mode, article_context)

        goal_text = "、".join(learning_goals or []) or "日常交流"
        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "你是中文用户的英语学习助手。默认使用中文回答，必要时给出简短自然的英文示例。"
                    "如果是 lesson 模式，必须围绕课文场景、新词和核心句型来回答，不要发散。"
                    "如果是 general 模式，可以解释表达、翻译句子、纠正语法，但保持简洁、友好、易懂。",
                ),
                (
                    "user",
                    "模式: {mode}\n"
                    "用户等级: {user_level}\n"
                    "学习目标: {goal_text}\n"
                    "课文上下文: {article_context}\n"
                    "用户消息: {message}\n"
                    "请给出一段简洁、有帮助、适合当前水平的回复。",
                ),
            ]
        ).partial(
            mode=mode,
            user_level=user_level if user_level is not None else "未评测",
            goal_text=goal_text,
            article_context=article_context or "无",
            message=message,
        )

        try:
            chain = prompt | self.llm
            response = await chain.ainvoke({})
            content = getattr(response, "content", "")
            if isinstance(content, str) and content.strip():
                return content.strip()
        except Exception:
            pass

        return self._fallback(mode, article_context)

    @staticmethod
    def _fallback(mode: str, article_context: dict[str, Any] | None) -> str:
        """模型不可用时的兜底回复。"""
        if mode == "lesson" and article_context:
            title = article_context.get("title", "今天这节课")
            return f"我们可以围绕《{title}》继续练习。你先试着用一句简单英文复述内容，我来帮你润色。"
        return "你可以直接把想表达的中文或英文发给我，我会尽量用简单清楚的方式帮你整理。"


ai_chat_service = AIChatService()
