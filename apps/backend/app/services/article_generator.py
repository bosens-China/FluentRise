"""
渐进式文章生成服务
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from datetime import date

from langchain_core.prompts import ChatPromptTemplate

from app.schemas.article import ArticleContent
from app.services.llm_factory import build_chat_model

LEVEL_VOCAB_TARGETS = {
    0: 50,
    1: 160,
    2: 320,
    3: 650,
    4: 1200,
    5: 2200,
    6: 3500,
}

GOAL_SCENE_HINTS = {
    "daily": ["邻里交流", "朋友聊天", "日常购物", "家庭生活"],
    "work": ["办公室沟通", "会议准备", "自我介绍", "邮件场景"],
    "study": ["校园生活", "老师提问", "课堂讨论", "图书馆"],
    "travel": ["机场", "酒店", "问路", "点餐"],
    "exam": ["复习计划", "课堂任务", "答题思路", "学习安排"],
    "hobby": ["电影", "运动", "音乐", "社交兴趣"],
    "parent": ["亲子交流", "学校通知", "家庭日常", "陪伴孩子"],
}

DIFFICULTY_BIAS_HINTS = {
    "steady": "保持当前等级内的稳定难度。",
    "ease_down": "同级内轻微降难，优先更短句、更少新词、更强复现。",
    "ease_up": "同级内轻微升难，但绝对不能跨级。",
}


@dataclass(frozen=True)
class LessonBudget:
    """当前课文的生成预算。"""

    level: int
    stage_name: str
    article_form: str
    paragraphs: int
    min_sentences: int
    max_sentences: int
    min_words_per_sentence: int
    max_words_per_sentence: int
    new_vocab_min: int
    new_vocab_max: int
    grammar_points: int
    exercises: int
    default_show_dialogue: bool
    difficulty_bias: str = "steady"


BASE_LEVEL_BUDGETS: dict[int, LessonBudget] = {
    0: LessonBudget(0, "foundation", "short_dialogue", 4, 1, 1, 2, 6, 2, 3, 1, 3, True),
    1: LessonBudget(1, "foundation", "short_dialogue", 4, 1, 2, 3, 7, 2, 3, 1, 3, True),
    2: LessonBudget(2, "foundation", "micro_story", 4, 1, 2, 4, 8, 3, 4, 1, 3, False),
    3: LessonBudget(3, "foundation", "micro_story", 5, 1, 2, 5, 10, 3, 4, 1, 4, False),
    4: LessonBudget(4, "foundation", "short_story", 5, 1, 2, 7, 12, 3, 5, 2, 4, False),
    5: LessonBudget(5, "foundation", "short_story", 6, 1, 2, 8, 14, 4, 5, 2, 4, False),
    6: LessonBudget(6, "foundation", "short_story", 6, 1, 3, 9, 16, 4, 5, 2, 4, False),
}


class ArticleGenerator:
    """面向零基础与初中级用户的渐进式文章生成器。"""

    def __init__(self) -> None:
        self.llm = build_chat_model(temperature=0.65)
        self.structured_llm = self.llm.with_structured_output(
            ArticleContent,
            method="function_calling",
        )

    def _derive_stage_name(self, completed_lessons: int, vocabulary_count: int, level: int) -> str:
        """根据学习进度估算同级内阶段。"""
        vocab_target = LEVEL_VOCAB_TARGETS.get(level, LEVEL_VOCAB_TARGETS[6])
        if completed_lessons < 4 or vocabulary_count < max(6, vocab_target // 12):
            return "warmup"
        if completed_lessons < 14 or vocabulary_count < max(18, vocab_target // 6):
            return "steady"
        return "stretch"

    def _build_stage_budget(
        self,
        *,
        user_level: int,
        completed_lessons: int,
        vocabulary_count: int,
    ) -> LessonBudget:
        """先根据阶段生成基础预算。"""
        base = BASE_LEVEL_BUDGETS.get(user_level, BASE_LEVEL_BUDGETS[0])
        stage_name = self._derive_stage_name(completed_lessons, vocabulary_count, user_level)

        if stage_name == "warmup":
            return LessonBudget(
                level=base.level,
                stage_name=stage_name,
                article_form=base.article_form,
                paragraphs=base.paragraphs,
                min_sentences=base.min_sentences,
                max_sentences=base.max_sentences,
                min_words_per_sentence=base.min_words_per_sentence,
                max_words_per_sentence=base.max_words_per_sentence,
                new_vocab_min=base.new_vocab_min,
                new_vocab_max=base.new_vocab_max,
                grammar_points=base.grammar_points,
                exercises=base.exercises,
                default_show_dialogue=base.default_show_dialogue,
            )

        if stage_name == "steady":
            return LessonBudget(
                level=base.level,
                stage_name=stage_name,
                article_form=base.article_form,
                paragraphs=base.paragraphs + (0 if base.article_form == "short_dialogue" else 1),
                min_sentences=base.min_sentences,
                max_sentences=base.max_sentences,
                min_words_per_sentence=base.min_words_per_sentence,
                max_words_per_sentence=base.max_words_per_sentence + 1,
                new_vocab_min=base.new_vocab_min,
                new_vocab_max=min(5, base.new_vocab_max + 1),
                grammar_points=min(2, base.grammar_points),
                exercises=base.exercises,
                default_show_dialogue=base.default_show_dialogue,
            )

        return LessonBudget(
            level=base.level,
            stage_name=stage_name,
            article_form="micro_story"
            if base.article_form == "short_dialogue"
            else base.article_form,
            paragraphs=base.paragraphs + 1,
            min_sentences=base.min_sentences,
            max_sentences=min(base.max_sentences + 1, 3),
            min_words_per_sentence=base.min_words_per_sentence,
            max_words_per_sentence=base.max_words_per_sentence + 2,
            new_vocab_min=base.new_vocab_min + 1,
            new_vocab_max=min(5, base.new_vocab_max + 1),
            grammar_points=min(2, base.grammar_points + 1),
            exercises=base.exercises + 1,
            default_show_dialogue=base.default_show_dialogue,
        )

    @staticmethod
    def _apply_difficulty_bias(budget: LessonBudget, difficulty_bias: str) -> LessonBudget:
        """在同级内做轻量难度保护。"""
        if difficulty_bias == "ease_down":
            adjusted_max_words = max(
                budget.min_words_per_sentence,
                budget.max_words_per_sentence - 2,
            )
            adjusted_new_vocab_max = max(budget.new_vocab_min, budget.new_vocab_max - 1)
            adjusted_new_vocab_min = min(max(1, budget.new_vocab_min - 1), adjusted_new_vocab_max)
            return LessonBudget(
                level=budget.level,
                stage_name=budget.stage_name,
                article_form=budget.article_form,
                paragraphs=max(3, budget.paragraphs - (1 if budget.paragraphs > 4 else 0)),
                min_sentences=budget.min_sentences,
                max_sentences=max(budget.min_sentences, budget.max_sentences - 1),
                min_words_per_sentence=budget.min_words_per_sentence,
                max_words_per_sentence=adjusted_max_words,
                new_vocab_min=adjusted_new_vocab_min,
                new_vocab_max=adjusted_new_vocab_max,
                grammar_points=max(1, budget.grammar_points),
                exercises=max(3, budget.exercises - 1),
                default_show_dialogue=budget.default_show_dialogue,
                difficulty_bias=difficulty_bias,
            )

        if difficulty_bias == "ease_up":
            adjusted_new_vocab_max = min(5, budget.new_vocab_max + 1)
            adjusted_new_vocab_min = min(budget.new_vocab_min + 1, adjusted_new_vocab_max)
            return LessonBudget(
                level=budget.level,
                stage_name=budget.stage_name,
                article_form=budget.article_form,
                paragraphs=budget.paragraphs
                + (1 if budget.article_form != "short_dialogue" else 0),
                min_sentences=budget.min_sentences,
                max_sentences=min(3, budget.max_sentences + 1),
                min_words_per_sentence=budget.min_words_per_sentence,
                max_words_per_sentence=budget.max_words_per_sentence + 1,
                new_vocab_min=adjusted_new_vocab_min,
                new_vocab_max=adjusted_new_vocab_max,
                grammar_points=min(2, budget.grammar_points + 1),
                exercises=budget.exercises + 1,
                default_show_dialogue=budget.default_show_dialogue,
                difficulty_bias=difficulty_bias,
            )

        return LessonBudget(
            level=budget.level,
            stage_name=budget.stage_name,
            article_form=budget.article_form,
            paragraphs=budget.paragraphs,
            min_sentences=budget.min_sentences,
            max_sentences=budget.max_sentences,
            min_words_per_sentence=budget.min_words_per_sentence,
            max_words_per_sentence=budget.max_words_per_sentence,
            new_vocab_min=budget.new_vocab_min,
            new_vocab_max=budget.new_vocab_max,
            grammar_points=budget.grammar_points,
            exercises=budget.exercises,
            default_show_dialogue=budget.default_show_dialogue,
            difficulty_bias=difficulty_bias,
        )

    def build_budget(
        self,
        user_level: int,
        completed_lessons: int,
        vocabulary_count: int,
        difficulty_bias: str = "steady",
    ) -> LessonBudget:
        """构建本次文章预算。"""
        base_budget = self._build_stage_budget(
            user_level=user_level,
            completed_lessons=completed_lessons,
            vocabulary_count=vocabulary_count,
        )
        return self._apply_difficulty_bias(base_budget, difficulty_bias)

    @staticmethod
    def _pick_scene(learning_goals: list[str], custom_goal: str | None) -> str:
        """优先使用自定义目标，否则从学习目标里选场景。"""
        if custom_goal:
            return custom_goal

        candidates: list[str] = []
        for goal in learning_goals:
            candidates.extend(GOAL_SCENE_HINTS.get(goal, []))
        if not candidates:
            candidates = GOAL_SCENE_HINTS["daily"]
        return random.choice(candidates)

    def build_prompt(
        self,
        *,
        budget: LessonBudget,
        learning_goals: list[str],
        custom_goal: str | None,
        known_words: list[str],
        recent_titles: list[str],
        recent_topics: list[str],
        target_date: date,
        feedback_reason: str | None,
        feedback_comment: str | None,
        difficulty_note: str | None,
    ) -> ChatPromptTemplate:
        """构建文章生成提示词。"""
        scene_hint = self._pick_scene(learning_goals, custom_goal)
        known_words_str = ", ".join(known_words[:30]) if known_words else "无"
        recent_titles_str = " | ".join(recent_titles[:8]) if recent_titles else "无"
        recent_topics_str = " | ".join(recent_topics[:6]) if recent_topics else "无"
        learning_goal_text = "、".join(learning_goals) if learning_goals else "daily"

        feedback_text = feedback_reason or "无"
        if feedback_comment:
            feedback_text = f"{feedback_text}; 补充：{feedback_comment}"

        difficulty_text = DIFFICULTY_BIAS_HINTS.get(
            budget.difficulty_bias, DIFFICULTY_BIAS_HINTS["steady"]
        )
        if difficulty_note:
            difficulty_text = f"{difficulty_text} 参考依据：{difficulty_note}"

        return ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "你是一名面向中文用户的英语课程设计师。"
                    "目标用户是零基础到中级的成年人或青少年。"
                    "请生成一篇严格控制难度、强调成就感和可理解性的短课文。"
                    "不要跨级，不要为了有趣而牺牲可读性。"
                    "优先复现旧词与高频句型，新词数量必须克制。"
                    "tips 的第一项标题必须是“导读”，内容用中文写成 2 到 3 句。"
                    "如果为对话，speaker 字段必须填写。"
                    "source_book 和 source_lesson 都保持 null。",
                ),
                (
                    "user",
                    "请生成今天的英语课文。\n"
                    f"- 日期: {target_date.isoformat()}\n"
                    f"- 当前等级: {budget.level}\n"
                    f"- 同级阶段: {budget.stage_name}\n"
                    f"- 学习目标: {learning_goal_text}\n"
                    f"- 场景方向: {scene_hint}\n"
                    f"- 文章形式: {budget.article_form}\n"
                    f"- 段落数: {budget.paragraphs}\n"
                    f"- 每段句子数: {budget.min_sentences}-{budget.max_sentences}\n"
                    f"- 每句单词数: {budget.min_words_per_sentence}-{budget.max_words_per_sentence}\n"
                    f"- 新词数: {budget.new_vocab_min}-{budget.new_vocab_max}\n"
                    f"- 语法点数量: {budget.grammar_points}\n"
                    f"- 练习题数量: {budget.exercises}\n"
                    f"- 已学词汇: {known_words_str}\n"
                    f"- 最近标题，避免重复: {recent_titles_str}\n"
                    f"- 最近主题，避免重复: {recent_topics_str}\n"
                    f"- 用户反馈: {feedback_text}\n"
                    f"- 难度保护策略: {difficulty_text}\n"
                    "要求：\n"
                    "1. level 0-1 优先使用极短句、对话和高频表达。\n"
                    "2. vocabulary 里的每个单词必须以正文里实际出现的词形返回，不能写原形或词典形；每个词都尽量补全 UK/US 音标。\n"
                    "3. grammar 只讲最关键的 1-2 个点，并用中文解释；examples 必须直接引用正文原句，不能另造例句。\n"
                    "4. exercises 以选择题和填空题为主。\n"
                    "5. 如果反馈是太难，只能轻微降难；如果太简单，只能轻微升难，不能跨级。\n"
                    "6. 标题自然现代，避免与最近标题重复。\n"
                    "7. 不要出现付费、会员、模型、系统设定等内容。",
                ),
            ]
        )

    async def generate(
        self,
        *,
        user_level: int,
        learning_goals: list[str],
        custom_goal: str | None = None,
        known_words: list[str] | None = None,
        target_date: date | None = None,
        recent_titles: list[str] | None = None,
        recent_topics: list[str] | None = None,
        completed_lessons: int = 0,
        vocabulary_count: int = 0,
        feedback_reason: str | None = None,
        feedback_comment: str | None = None,
        difficulty_bias: str = "steady",
        difficulty_note: str | None = None,
    ) -> ArticleContent:
        """生成文章。"""
        actual_date = target_date or date.today()
        budget = self.build_budget(
            user_level=user_level,
            completed_lessons=completed_lessons,
            vocabulary_count=vocabulary_count,
            difficulty_bias=difficulty_bias,
        )
        prompt = self.build_prompt(
            budget=budget,
            learning_goals=learning_goals,
            custom_goal=custom_goal,
            known_words=known_words or [],
            recent_titles=recent_titles or [],
            recent_topics=recent_topics or [],
            target_date=actual_date,
            feedback_reason=feedback_reason,
            feedback_comment=feedback_comment,
            difficulty_note=difficulty_note,
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
