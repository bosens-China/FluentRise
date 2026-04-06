"""
句子拆解助手服务
"""

from __future__ import annotations

import re

from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.llm_factory import build_chat_model


class SentenceChunk(BaseModel):
    """句子分块说明。"""

    text: str = Field(..., description="原句中的分块")
    explanation: str = Field(..., description="这一块的中文解释")


class SentenceKeyword(BaseModel):
    """关键词说明。"""

    word: str = Field(..., description="关键词或短语")
    meaning: str = Field(..., description="中文意思")
    usage: str = Field(..., description="在本句中的作用或用法")


class SentenceExample(BaseModel):
    """可替换模板例句。"""

    en: str = Field(..., description="英文例句")
    zh: str = Field(..., description="中文释义")


class SentenceBreakdownResult(BaseModel):
    """句子拆解结果。"""

    translation: str = Field(..., description="整句中文")
    chunks: list[SentenceChunk] = Field(default_factory=list, description="分块拆解")
    keywords: list[SentenceKeyword] = Field(default_factory=list, description="关键词解释")
    pattern: str = Field(..., description="句型骨架")
    pattern_explanation: str = Field(..., description="句型为什么这么说")
    reusable_examples: list[SentenceExample] = Field(default_factory=list, description="可替换模板")
    simpler_version: str = Field(..., description="更简单的英文版本")


class SentenceHelperService:
    """面向零基础用户的句子拆解助手。"""

    def __init__(self) -> None:
        self.enabled = bool(settings.OPENAI_API_KEY)
        self.llm = build_chat_model(temperature=0.25)
        self.structured_llm = self.llm.with_structured_output(
            SentenceBreakdownResult,
            method="function_calling",
        )

    async def analyze(
        self,
        *,
        sentence: str,
        user_level: int | None,
        article_context: dict[str, object] | None = None,
    ) -> SentenceBreakdownResult:
        """分析句子并返回固定结构。"""
        clean_sentence = sentence.strip()
        if not clean_sentence:
            raise ValueError("待拆解句子不能为空")

        if not self.enabled:
            return self._fallback(clean_sentence, article_context)

        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "你是中文用户的英语句子拆解助手，目标用户是零基础成年人或青少年。"
                    "请用简单中文解释，不要炫技，不要堆术语。"
                    "必须严格输出固定结构：整句中文、2到5个分块、最多3个关键词、句型骨架、句型说明、2个可替换例句、一个更简单版本。"
                    "如果原句已经很简单，也要告诉用户为什么简单、重点在哪里。"
                    "解释要让用户看完就能模仿，不要输出过长段落。"
                    "更简单版本必须保持原意，但可以更口语、更短。"
                    "pattern 字段请给出一句可以复用的骨架，例如：I am + 身份。",
                ),
                (
                    "user",
                    "用户等级: {user_level}\n"
                    "课文上下文: {article_context}\n"
                    "请拆解这句英文: {sentence}",
                ),
            ]
        ).partial(
            user_level=user_level if user_level is not None else "未评测",
            article_context=article_context or "无",
            sentence=clean_sentence,
        )

        try:
            chain = prompt | self.structured_llm
            result = await chain.ainvoke({})
            return (
                result
                if isinstance(result, SentenceBreakdownResult)
                else SentenceBreakdownResult.model_validate(result)
            )
        except Exception:
            return self._fallback(clean_sentence, article_context)

    @staticmethod
    def _fallback(
        sentence: str,
        article_context: dict[str, object] | None,
    ) -> SentenceBreakdownResult:
        """模型不可用时的兜底结果。"""
        paragraph_zh = ""
        if article_context:
            paragraph_zh = str(article_context.get("paragraph_zh") or "")

        parts = [
            item.strip()
            for item in re.split(
                r"(?<=[,.!?;])\s+|\s+(?:and|but|because|when|after|before)\s+", sentence
            )
            if item.strip()
        ]
        if not parts:
            parts = [sentence]

        keywords: list[SentenceKeyword] = []
        seen_words: set[str] = set()
        for token in re.findall(r"[A-Za-z][A-Za-z'-]*", sentence):
            lower_token = token.lower()
            if lower_token in seen_words:
                continue
            seen_words.add(lower_token)
            keywords.append(
                SentenceKeyword(
                    word=token,
                    meaning="请结合课文上下文理解",
                    usage="这是句子里的关键词，可以先记住它在这句里的位置。",
                )
            )
            if len(keywords) >= 3:
                break

        return SentenceBreakdownResult(
            translation=paragraph_zh or "这句话的大意和当前课文内容一致，可以先结合课文中文理解。",
            chunks=[
                SentenceChunk(
                    text=part,
                    explanation="先把这一块当成一个整体来记，再回到整句里理解。",
                )
                for part in parts[:5]
            ],
            keywords=keywords,
            pattern="先按课文原句模仿，再替换其中的关键词。",
            pattern_explanation="这句话适合先整块记忆，不必一次把所有语法名词都弄懂。",
            reusable_examples=[
                SentenceExample(
                    en=sentence,
                    zh=paragraph_zh or "先复述原句，熟悉语序。",
                ),
                SentenceExample(
                    en="I can say this in my own words.",
                    zh="我可以用自己的话再说一遍。",
                ),
            ],
            simpler_version=sentence,
        )


sentence_helper_service = SentenceHelperService()
