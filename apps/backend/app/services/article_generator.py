"""
AI 文章生成服务
基于新概念骨架 + 用户画像，生成可控的现代化学习文章。
"""

import json
import random
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from pydantic import SecretStr

from app.core.config import settings
from app.schemas.article import ArticleContent

NCE_SKELETON_PATH = Path(__file__).parent.parent / "data" / "nce_skeleton.json"
NCE_SKELETON_META_PATH = Path(__file__).parent.parent / "data" / "nce_skeleton_meta.json"

NCE_SKELETON = json.loads(NCE_SKELETON_PATH.read_text(encoding="utf-8"))
NCE_SKELETON_META = json.loads(NCE_SKELETON_META_PATH.read_text(encoding="utf-8"))


@dataclass(frozen=True)
class LessonContext:
    """骨架课程上下文。"""

    book: int
    lesson: int
    title: str
    theme: str
    grammar: list[str]
    vocab_focus: list[str]
    base_level: int
    level_offset: int
    goal_tags: set[str]


@dataclass(frozen=True)
class OutputPlan:
    """输出格式蓝图。"""

    paragraphs: int
    min_sentences: int
    max_sentences: int
    min_words_per_sentence: int
    max_words_per_sentence: int
    grammar_points: int
    exercises: int


class ArticleGenerator:
    """文章生成器。"""

    def __init__(self) -> None:
        self.llm = ChatOpenAI(
            model=settings.OPENAI_MODEL,
            api_key=SecretStr(settings.OPENAI_API_KEY) if settings.OPENAI_API_KEY else None,
            base_url=settings.OPENAI_BASE_URL,
            temperature=0.7,
        )
        # 使用 function_calling 模式以获得更好的兼容性，避免部分 Provider 不支持 json_schema
        self.structured_llm = self.llm.with_structured_output(
            ArticleContent, method="function_calling"
        )
        self.goal_keywords: dict[str, list[str]] = NCE_SKELETON_META.get("goal_keywords", {})
        self.book_base_level: dict[int, int] = {
            int(k): int(v) for k, v in NCE_SKELETON_META.get("book_base_level", {}).items()
        }
        self.level_output_rules: dict[int, dict[str, int]] = {
            int(k): v for k, v in NCE_SKELETON_META.get("level_output_rules", {}).items()
        }
        self.available_goal_tags = set(NCE_SKELETON_META.get("goal_taxonomy", []))
        self.lesson_pool = self._build_lesson_pool()

    def _infer_goal_tags(self, theme: str, title: str) -> set[str]:
        """从标题与主题中推断标准目标标签。"""
        text = f"{theme} {title}".lower()
        tags: set[str] = set()
        for goal, keywords in self.goal_keywords.items():
            if any(keyword in text for keyword in keywords):
                tags.add(goal)
        if not tags:
            tags.add("daily")
        return tags

    def _build_lesson_pool(self) -> list[LessonContext]:
        """加载并增强骨架课程，生成可打分的候选池。"""
        pool: list[LessonContext] = []
        for book_data in NCE_SKELETON.get("books", []):
            book = int(book_data.get("book", 1))
            lessons = sorted(book_data.get("lessons", []), key=lambda x: int(x.get("lesson", 0)))
            lesson_count = len(lessons)
            base_level = self.book_base_level.get(book, min(book + 1, 6))

            for idx, lesson in enumerate(lessons):
                ratio = idx / (lesson_count - 1) if lesson_count > 1 else 0.5
                if ratio < 0.33:
                    level_offset = -1
                elif ratio < 0.66:
                    level_offset = 0
                else:
                    level_offset = 1

                title = str(lesson.get("title", "Untitled"))
                theme = str(lesson.get("theme", "General"))
                grammar = [str(item) for item in lesson.get("grammar", [])]
                vocab_focus = [str(item) for item in lesson.get("vocab_focus", [])]
                goal_tags = self._infer_goal_tags(theme, title)

                pool.append(
                    LessonContext(
                        book=book,
                        lesson=int(lesson.get("lesson", 1)),
                        title=title,
                        theme=theme,
                        grammar=grammar,
                        vocab_focus=vocab_focus,
                        base_level=base_level,
                        level_offset=level_offset,
                        goal_tags=goal_tags,
                    )
                )
        return pool

    def _build_output_plan(self, target_level: int) -> OutputPlan:
        """根据目标等级构建输出蓝图。"""
        raw = self.level_output_rules.get(target_level) or self.level_output_rules.get(3, {})
        return OutputPlan(
            paragraphs=int(raw.get("paragraphs", 6)),
            min_sentences=int(raw.get("min_sentences", 1)),
            max_sentences=int(raw.get("max_sentences", 3)),
            min_words_per_sentence=int(raw.get("min_words_per_sentence", 10)),
            max_words_per_sentence=int(raw.get("max_words_per_sentence", 18)),
            grammar_points=int(raw.get("grammar_points", 2)),
            exercises=int(raw.get("exercises", 3)),
        )

    def select_skeleton(self, user_level: int, learning_goals: list[str]) -> LessonContext:
        """按等级和学习目标打分选骨架。"""
        target_level = min(user_level + 1, 6)
        normalized_goals = {goal for goal in learning_goals if goal in self.available_goal_tags}
        if not normalized_goals:
            normalized_goals = {"daily"}

        scored: list[tuple[float, LessonContext]] = []
        for lesson in self.lesson_pool:
            level_gap = abs(lesson.base_level - target_level)
            if level_gap > 2:
                continue

            score = 10.0 - 3.0 * level_gap
            if lesson.goal_tags & normalized_goals:
                score += 4.0
            if lesson.level_offset >= 0:
                score += 2.0
            score += random.uniform(0.0, 0.4)
            scored.append((score, lesson))

        if not scored:
            return random.choice(self.lesson_pool)

        scored.sort(key=lambda item: item[0], reverse=True)
        top_candidates = [item[1] for item in scored[:12]]
        return random.choice(top_candidates)

    def build_prompt(
        self,
        skeleton: LessonContext,
        user_level: int,
        learning_goals: list[str],
        custom_goal: str | None,
        known_words: list[str],
        target_date: date,
        plan: OutputPlan,
    ) -> ChatPromptTemplate:
        """构建可控生成提示词。"""
        target_level = min(user_level + 1, 6)
        goal_str = ", ".join(learning_goals) if learning_goals else "daily"
        custom_goal_text = custom_goal or "无"
        known_words_str = ", ".join(known_words) if known_words else "无"

        return ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    """你是资深英语教学设计师。
请严格执行「新瓶装旧酒」策略：保留参考骨架中的核心语法与词汇（旧酒），但完全重写一个符合用户诉求的现代背景故事（新瓶）。
同时，内容难度需恰好在用户的 i+1 范围内（当前等级到目标等级之间），让用户每次学习都能获得提升。
你将通过结构化输出返回结果，必须严格遵守字段语义与蓝图约束。""",
                ),
                (
                    "user",
                    """请生成今日学习文章：

【用户画像】
- 当前等级: {user_level}/6
- 目标等级: {target_level}/6
- 学习目标标签: {goals}
- 用户自定义诉求: {custom_goal}
- 用户已掌握词汇: {known_words} （请在课文中尽量使用这些词作为基础，并自然引入少量高于这些基础的新词）

【参考骨架】
- 册别: {source_book}
- 课次: {source_lesson}
- 原始主题: {theme}
- 参考语法点: {grammar}
- 参考词汇: {vocab}

【输出蓝图】
- 段落数必须: {paragraphs}
- 每段英文句数: {min_sentences}~{max_sentences}
- 每句英文词数建议: {min_words_per_sentence}~{max_words_per_sentence}
- 必须包含生词部分 (vocabulary)，生词数量至少: 4 个，需包含单词、中英音标及释义。
- 课文部分需要严格包含你所给出的生词，确保生词在课文中被使用。
- 语法讲解数量至少: {grammar_points}
- 练习数量至少: {exercises}
- 练习类型必须全部为阅读理解单选题 (choice)，必须提供4个选项 (options)，并给出准确的参考答案 (answer)。
- 如果是对话形式，请在 content 中标注 speaker (例如: "Alice", "Bob", "Narrator")

【日期】
{date}
""",
                ),
            ]
        ).partial(
            user_level=user_level,
            target_level=target_level,
            goals=goal_str,
            custom_goal=custom_goal_text,
            known_words=known_words_str,
            source_book=skeleton.book,
            source_lesson=skeleton.lesson,
            theme=skeleton.theme,
            grammar=", ".join(skeleton.grammar),
            vocab=", ".join(skeleton.vocab_focus[:12]),
            paragraphs=plan.paragraphs,
            min_sentences=plan.min_sentences,
            max_sentences=plan.max_sentences,
            min_words_per_sentence=plan.min_words_per_sentence,
            max_words_per_sentence=plan.max_words_per_sentence,
            grammar_points=plan.grammar_points,
            exercises=plan.exercises,
            date=target_date.isoformat(),
        )

    @staticmethod
    def _ensure_article_content(result: Any) -> ArticleContent:
        """确保结构化输出结果是 ArticleContent。"""
        if isinstance(result, ArticleContent):
            return result
        return ArticleContent.model_validate(result)

    async def generate(
        self,
        user_level: int,
        learning_goals: list[str],
        custom_goal: str | None = None,
        known_words: list[str] | None = None,
        target_date: date | None = None,
    ) -> ArticleContent:
        """生成文章。"""
        actual_date = target_date or date.today()
        target_level = min(user_level + 1, 6)
        skeleton = self.select_skeleton(user_level, learning_goals)
        plan = self._build_output_plan(target_level)
        prompt = self.build_prompt(
            skeleton=skeleton,
            user_level=user_level,
            learning_goals=learning_goals,
            custom_goal=custom_goal,
            known_words=known_words or [],
            target_date=actual_date,
            plan=plan,
        )
        chain = prompt | self.structured_llm

        print(f"[ArticleGenerator] Generating article for level {target_level}...")
        try:
            result = await chain.ainvoke({})
            article = self._ensure_article_content(result)
        except Exception as exc:
            print(f"[ArticleGenerator] Generation Failed (Structure/API error): {exc}")
            raise ValueError(f"结构化输出或 API 调用失败：{exc}") from exc

        # 强制覆盖来源字段，避免模型漂移
        article.source_book = skeleton.book
        article.source_lesson = skeleton.lesson
        article.level = target_level

        return article


article_generator = ArticleGenerator()
