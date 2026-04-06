"""
渐进式文章生成服务。
"""

from __future__ import annotations

from datetime import date

from langchain_core.prompts import ChatPromptTemplate

from app.core.time import app_today
from app.schemas.article import ArticleContent
from app.services.article_generation_rules import (
    SUPPORTED_SPEAKERS,
    LessonBudget,
    build_budget,
    pick_scene,
)
from app.services.llm_factory import build_smart_model


class ArticleGenerator:
    """基于 i+1 理论和错题本的文章生成引擎。"""

    def __init__(self) -> None:
        # 使用更聪明的模型，因为生成文章逻辑复杂，需要严格遵循 i+1 和错题复现
        self.llm = build_smart_model()
        self.structured_llm = self.llm.with_structured_output(
            ArticleContent,
            method="function_calling",
        )

    def build_prompt(
        self,
        *,
        budget: LessonBudget,
        learning_goals: list[str],
        custom_goal: str | None,
        interests: list[str] | None,
        known_words: list[str],
        mistake_words: list[str],
        target_date: date,
        feedback_reason: str | None,
        feedback_comment: str | None,
    ) -> ChatPromptTemplate:
        """构建文章生成提示词。"""
        scene_hint = pick_scene(learning_goals, custom_goal)
        known_words_str = ", ".join(known_words[:200]) if known_words else "无"
        mistake_words_str = ", ".join(mistake_words) if mistake_words else "无"

        goals_str = "、".join(learning_goals) if learning_goals else "daily"
        interests_str = "、".join(interests) if interests else "无"
        supported_speakers = ", ".join(SUPPORTED_SPEAKERS)

        feedback_text = feedback_reason or "无"
        if feedback_comment:
            feedback_text = f"{feedback_text}; 补充：{feedback_comment}"

        return ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "你是一名精通克拉申（Krashen）i+1 理论的高级英语课程设计师。\n"
                    "目标用户是零基础到高级的中文母语者。\n"
                    "核心要求：\n"
                    "1. 【严格的难度控制】：你必须生成一篇约 {target_word_count} 词的文章。\n"
                    "2. 【生词红线】：文章中 95% 的词汇必须来自用户的已学词汇（已知词汇池）或极其基础的词汇。整篇文章包含的新词绝对不能超过 {new_vocab_max} 个！\n"
                    "3. 【语境复现（最重要）】：如果你收到了“需巩固的错题词汇”，你必须将其自然地编织进新的课文中，实现错题复现。\n"
                    "4. 【兴趣倾斜】：你可以参考用户的兴趣标签作为调味剂，但在保证实用场景为主的前提下，不用牵强附会。\n"
                    "5. 【标准化输出】：提取出所有生词，并列出 1-2 个重点语法，配备3道基于课文的选择/填空题。\n"
                    "6. source_book 和 source_lesson 必须为 null。\n"
                    f"7. 对话人物优先使用这些名称：{supported_speakers}；如果不是对话，speaker 字段可以为 Narrator。\n",
                ),
                (
                    "user",
                    "请生成今天的英语课文。\n"
                    f"- 日期: {target_date.isoformat()}\n"
                    f"- 目标 CEFR 难度: Level {budget.level} (0-6)\n"
                    f"- 核心场景诉求: {scene_hint} (目标: {goals_str})\n"
                    f"- 个人兴趣倾斜: {interests_str}\n"
                    f"- 目标字数: 约 {budget.target_word_count} 词\n"
                    f"- 新词数量上限: ≤ {budget.new_vocab_max} 个\n"
                    f"- 需巩固的错题词汇 (必须自然融入课文): {mistake_words_str}\n"
                    f"- 用户的已知词汇池 (尽量多使用): {known_words_str}\n"
                    f"- 用户重新生成反馈 (如非首次生成): {feedback_text}\n"
                    "要求：\n"
                    "1. Level 0-1 必须极短、句子简单。\n"
                    "2. vocabulary 提取的新词必须以正文里实际出现的词形返回。\n"
                    "3. grammar 讲解请用中文解释，examples 必须直接引用正文原句。\n"
                    "4. exercises 题型为 choice 或 fill_blank。\n"
                    "5. 导读、语法、生词、练习都要与正文严格对应。",
                ),
            ]
        )

    async def generate(
        self,
        *,
        user_level: int,
        learning_goals: list[str],
        custom_goal: str | None = None,
        interests: list[str] | None = None,
        known_words: list[str] | None = None,
        mistake_words: list[str] | None = None,
        target_date: date | None = None,
        feedback_reason: str | None = None,
        feedback_comment: str | None = None,
    ) -> ArticleContent:
        """生成文章。"""
        actual_date = target_date or app_today()
        budget = build_budget(user_level=user_level)

        prompt = self.build_prompt(
            budget=budget,
            learning_goals=learning_goals,
            custom_goal=custom_goal,
            interests=interests,
            known_words=known_words or [],
            mistake_words=mistake_words or [],
            target_date=actual_date,
            feedback_reason=feedback_reason,
            feedback_comment=feedback_comment,
        )
        chain = prompt | self.structured_llm

        try:
            result = await chain.ainvoke({})
            article = (
                result
                if isinstance(result, ArticleContent)
                else ArticleContent.model_validate(result)
            )
        except Exception as exc:
            raise ValueError(f"文章生成失败: {exc}") from exc

        article.level = budget.level
        article.source_book = None
        article.source_lesson = None
        return article


article_generator = ArticleGenerator()
