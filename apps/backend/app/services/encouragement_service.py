"""
AI 鼓励文案服务
"""

from __future__ import annotations

import random

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, SecretStr

from app.core.config import settings


class EncouragementResult(BaseModel):
    """中英文鼓励结果。"""

    zh: str
    en: str


FALLBACK_MESSAGES: dict[str, list[EncouragementResult]] = {
    "lesson": [
        EncouragementResult(zh="今天这节课学得很扎实。", en="You worked through today's lesson with steady focus."),
        EncouragementResult(zh="这一点点积累很珍贵。", en="This small step matters more than it looks."),
    ],
    "playground": [
        EncouragementResult(zh="这一轮练习完成得很不错。", en="You handled this practice round really well."),
        EncouragementResult(zh="刚刚的投入很有价值。", en="The effort you just gave really counts."),
    ],
    "review": [
        EncouragementResult(zh="愿意回来复习，本身就很棒。", en="Coming back to review is already a strong move."),
        EncouragementResult(zh="记忆正在一点点变稳。", en="Your memory is getting steadier step by step."),
    ],
}


class EncouragementService:
    """AI 鼓励文案服务。"""

    def __init__(self) -> None:
        self.enabled = bool(settings.OPENAI_API_KEY)
        self.llm = ChatOpenAI(
            model=settings.OPENAI_MODEL,
            api_key=SecretStr(settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None,
            base_url=settings.OPENAI_BASE_URL,
            temperature=0.7,
        )
        self.structured_llm = self.llm.with_structured_output(
            EncouragementResult,
            method="function_calling",
        )

    async def generate(
        self,
        *,
        context_type: str,
        user_level: int | None = None,
        title: str | None = None,
        accuracy: float | None = None,
        streak_days: int | None = None,
    ) -> EncouragementResult:
        """生成中英文鼓励语。"""
        if not self.enabled:
            return self._fallback(context_type)

        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "你是一个温和、克制的英语学习鼓励助手。"
                    "只输出简短鼓励，不要安排任务，不要给出下一步建议，不要命令用户去做什么。"
                    "请返回一条中文和一条英文，语气真诚自然。",
                ),
                (
                    "user",
                    "请为用户生成一组学习鼓励。\n"
                    f"- 场景: {context_type}\n"
                    f"- 用户等级: {user_level if user_level is not None else 'unknown'}\n"
                    f"- 课程标题: {title or '无'}\n"
                    f"- 准确率: {accuracy if accuracy is not None else '无'}\n"
                    f"- 连续打卡天数: {streak_days if streak_days is not None else '无'}\n"
                    "要求：\n"
                    "1. 中文不超过 28 个字。\n"
                    "2. 英文不超过 20 个词。\n"
                    "3. 不要出现“继续去做”“建议你”等引导动作。\n"
                    "4. 风格温和、鼓励、不夸张。",
                ),
            ]
        )

        try:
            chain = prompt | self.structured_llm
            result = await chain.ainvoke({})
            if isinstance(result, EncouragementResult):
                return result
            return EncouragementResult.model_validate(result)
        except Exception:
            return self._fallback(context_type)

    def _fallback(self, context_type: str) -> EncouragementResult:
        """兜底鼓励文案。"""
        return random.choice(FALLBACK_MESSAGES.get(context_type, FALLBACK_MESSAGES["lesson"]))


encouragement_service = EncouragementService()
