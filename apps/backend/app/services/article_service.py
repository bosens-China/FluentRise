"""
文章服务辅助方法
"""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.article import Article
from app.models.learning_feedback import LearningFeedback
from app.models.vocabulary import Vocabulary
from app.schemas.article import ArticleContent


def apply_generated_article(
    article: Article,
    generated: ArticleContent,
    target_date: date,
    *,
    reset_progress: bool,
) -> Article:
    """将生成结果写回文章模型。"""
    article.title = generated.title
    article.publish_date = target_date
    article.level = generated.level
    article.source_book = generated.source_book
    article.source_lesson = generated.source_lesson
    article.vocabulary = [item.model_dump() for item in generated.vocabulary]
    article.content = [item.model_dump() for item in generated.content]
    article.grammar = [item.model_dump() for item in generated.grammar]
    article.tips = [item.model_dump() for item in generated.tips]
    article.exercises = [item.model_dump() for item in (generated.exercises or [])]
    article.updated_at = datetime.utcnow()

    if reset_progress:
        article.is_read = 0
        article.is_completed = False

    return article


def extract_recent_topic(article: Article) -> str:
    """从历史文章中提取主题线索。"""
    if article.title:
        return article.title
    if article.content:
        first_paragraph = article.content[0]
        return first_paragraph.get("zh") or first_paragraph.get("en") or ""
    return ""


async def collect_generation_context(
    db: AsyncSession,
    *,
    user_id: int,
    target_date: date,
    current_article_id: int | None = None,
) -> tuple[list[str], list[str], int, int, list[str]]:
    """收集生成文章所需上下文。"""
    recent_result = await db.execute(
        select(Article)
        .where(Article.user_id == user_id)
        .where(Article.publish_date <= target_date)
        .order_by(desc(Article.publish_date), desc(Article.created_at))
        .limit(8)
    )
    recent_articles = [
        article
        for article in recent_result.scalars().all()
        if current_article_id is None or article.id != current_article_id
    ]

    recent_titles = [article.title for article in recent_articles if article.title]
    recent_topics = [topic for article in recent_articles if (topic := extract_recent_topic(article))]

    completed_lessons_result = await db.execute(
        select(func.count())
        .select_from(Article)
        .where(Article.user_id == user_id)
        .where(Article.is_completed.is_(True))
    )
    completed_lessons = int(completed_lessons_result.scalar_one())

    vocabulary_count_result = await db.execute(
        select(func.count())
        .select_from(Vocabulary)
        .where(Vocabulary.user_id == user_id)
    )
    vocabulary_count = int(vocabulary_count_result.scalar_one())

    known_words_result = await db.execute(
        select(Vocabulary.word)
        .where(Vocabulary.user_id == user_id)
        .order_by(desc(Vocabulary.created_at))
    )
    known_words = [row[0] for row in known_words_result.all()]

    return recent_titles, recent_topics, completed_lessons, vocabulary_count, known_words


async def derive_difficulty_bias(
    db: AsyncSession,
    *,
    user_id: int,
    explicit_reason: str | None,
) -> tuple[str, str | None]:
    """根据显式反馈和最近历史反馈推导同级难度保护策略。"""
    if explicit_reason == "too_hard":
        return "ease_down", "本次明确反馈“太难”，先在同级内向下保护。"
    if explicit_reason == "too_easy":
        return "ease_up", "本次明确反馈“太简单”，先在同级内轻微加一点变化。"

    feedback_result = await db.execute(
        select(LearningFeedback.feedback_type)
        .where(LearningFeedback.user_id == user_id)
        .where(LearningFeedback.module == "lesson")
        .order_by(desc(LearningFeedback.created_at))
        .limit(4)
    )
    feedback_rows = feedback_result.all()
    if not feedback_rows:
        return "steady", None

    too_hard_count = sum(1 for row in feedback_rows if row[0] == "too_hard")
    too_easy_count = sum(1 for row in feedback_rows if row[0] == "too_easy")

    if too_hard_count >= 2 and too_hard_count > too_easy_count:
        return "ease_down", "最近几次课文反馈偏难，自动降低句长与新词密度。"
    if too_easy_count >= 2 and too_easy_count > too_hard_count:
        return "ease_up", "最近几次课文反馈偏简单，自动增加一点句型变化。"

    return "steady", None
