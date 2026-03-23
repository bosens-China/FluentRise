"""
文章服务辅助方法
"""

from __future__ import annotations

import re
from datetime import date, datetime

from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.article import Article
from app.models.learning_feedback import LearningFeedback
from app.models.vocabulary import Vocabulary
from app.schemas.article import (
    ArticleContent,
    BilingualContent,
    CultureTip,
    Exercise,
    GrammarPoint,
    VocabularyWord,
)
from app.services.llm_factory import build_chat_model


class VocabularyPhoneticItem(BaseModel):
    word: str = Field(..., description="正文里实际出现的英文词形")
    uk_phonetic: str | None = Field(None, description="英式音标")
    us_phonetic: str | None = Field(None, description="美式音标")


class VocabularyPhoneticBatch(BaseModel):
    items: list[VocabularyPhoneticItem] = Field(default_factory=list)


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


async def reconcile_article_record(
    db: AsyncSession,
    *,
    user_id: int,
    article: Article,
) -> Article:
    """读取旧文章时自动做一次轻量对齐修正。"""
    normalized = await normalize_generated_article(
        db,
        user_id=user_id,
        generated=ArticleContent(
            title=article.title,
            level=article.level,
            source_book=article.source_book,
            source_lesson=article.source_lesson,
            vocabulary=[VocabularyWord.model_validate(item) for item in (article.vocabulary or [])],
            content=[BilingualContent.model_validate(item) for item in (article.content or [])],
            grammar=[GrammarPoint.model_validate(item) for item in (article.grammar or [])],
            tips=[CultureTip.model_validate(item) for item in (article.tips or [])],
            exercises=[Exercise.model_validate(item) for item in (article.exercises or [])],
        ),
    )
    return apply_generated_article(article, normalized, article.publish_date, reset_progress=False)


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9\s]", " ", value.lower())).strip()


def _match_content_sentence(
    sentence: str,
    content_items: list[BilingualContent],
) -> BilingualContent | None:
    normalized_sentence = _normalize_text(sentence)
    if not normalized_sentence:
        return None

    for item in content_items:
        normalized_content = _normalize_text(item.en)
        if (
            normalized_content == normalized_sentence
            or normalized_sentence in normalized_content
            or normalized_content in normalized_sentence
        ):
            return item
    return None


def _candidate_surface_forms(word: str) -> list[str]:
    base = word.strip().lower()
    if not base:
        return []

    candidates = [base]
    if " " not in base:
        candidates.extend(
            [
                f"{base}s",
                f"{base}es",
                f"{base}d",
                f"{base}ed",
                f"{base}ing",
            ]
        )
        if base.endswith("y") and len(base) > 1 and base[-2] not in "aeiou":
            candidates.append(f"{base[:-1]}ies")
        if base.endswith("e"):
            candidates.extend([f"{base[:-1]}ing", f"{base}d"])
        if base.endswith("f"):
            candidates.append(f"{base[:-1]}ves")
        if base.endswith("fe"):
            candidates.append(f"{base[:-2]}ves")

    deduplicated: list[str] = []
    seen: set[str] = set()
    for item in candidates:
        if item and item not in seen:
            seen.add(item)
            deduplicated.append(item)
    return deduplicated


def _find_surface_form(word: str, content_items: list[BilingualContent]) -> str | None:
    for candidate in _candidate_surface_forms(word):
        pattern = re.compile(rf"\b{re.escape(candidate)}\b", re.IGNORECASE)
        for item in content_items:
            match = pattern.search(item.en)
            if match:
                return match.group(0)
    return None


async def _enrich_missing_phonetics(
    vocabulary: list[VocabularyWord],
) -> list[VocabularyWord]:
    missing_words = [
        item.word for item in vocabulary if not item.uk_phonetic or not item.us_phonetic
    ]
    if not missing_words:
        return vocabulary

    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "你是英语词汇助教。请只为用户给出的英文词形补全 UK 和 US 音标，"
                "不要改写单词，不要添加额外解释。",
            ),
            (
                "user",
                "请为这些正文中实际出现的词补全音标：\n"
                f"{', '.join(missing_words)}\n"
                "返回字段 items，每项包含 word、uk_phonetic、us_phonetic。",
            ),
        ]
    )

    try:
        llm = build_chat_model(temperature=0).with_structured_output(
            VocabularyPhoneticBatch,
            method="function_calling",
        )
        response = await (prompt | llm).ainvoke({})
        result = (
            response
            if isinstance(response, VocabularyPhoneticBatch)
            else VocabularyPhoneticBatch.model_validate(response)
        )
    except Exception:
        return vocabulary

    phonetic_map = {item.word.lower(): item for item in result.items}
    enriched: list[VocabularyWord] = []
    for item in vocabulary:
        phonetic_item = phonetic_map.get(item.word.lower())
        enriched.append(
            VocabularyWord(
                word=item.word,
                meaning=item.meaning,
                uk_phonetic=item.uk_phonetic
                or (phonetic_item.uk_phonetic if phonetic_item else None),
                us_phonetic=item.us_phonetic
                or (phonetic_item.us_phonetic if phonetic_item else None),
            )
        )
    return enriched


async def normalize_generated_article(
    db: AsyncSession,
    *,
    user_id: int,
    generated: ArticleContent,
) -> ArticleContent:
    """对生成结果做正文对齐，避免生词与语法和课文脱节。"""
    content_items = [BilingualContent.model_validate(item) for item in generated.content]

    existing_vocab_result = await db.execute(
        select(Vocabulary)
        .where(Vocabulary.user_id == user_id)
        .order_by(desc(Vocabulary.created_at))
    )
    existing_vocab = existing_vocab_result.scalars().all()
    existing_vocab_map = {item.word.lower(): item for item in existing_vocab}

    normalized_vocabulary: list[VocabularyWord] = []
    seen_words: set[str] = set()
    for item in generated.vocabulary:
        surface_word = _find_surface_form(item.word, content_items)
        if not surface_word:
            continue

        existing_entry = existing_vocab_map.get(item.word.lower()) or existing_vocab_map.get(
            surface_word.lower()
        )
        vocabulary_word = VocabularyWord(
            word=surface_word,
            meaning=item.meaning,
            uk_phonetic=item.uk_phonetic
            or (existing_entry.uk_phonetic if existing_entry else None),
            us_phonetic=item.us_phonetic
            or (existing_entry.us_phonetic if existing_entry else None),
        )

        normalized_key = vocabulary_word.word.lower()
        if normalized_key in seen_words:
            continue
        seen_words.add(normalized_key)
        normalized_vocabulary.append(vocabulary_word)

    normalized_grammar: list[GrammarPoint] = []
    for item in generated.grammar:
        aligned_examples: list[BilingualContent] = []
        seen_examples: set[str] = set()
        for example in item.examples:
            matched_content = _match_content_sentence(example.en, content_items)
            if not matched_content:
                continue

            example_key = _normalize_text(matched_content.en)
            if example_key in seen_examples:
                continue
            seen_examples.add(example_key)
            aligned_examples.append(matched_content)

        if not aligned_examples:
            continue

        normalized_grammar.append(
            GrammarPoint(
                point=item.point,
                explanation=item.explanation,
                examples=aligned_examples[:2],
            )
        )

    normalized_vocabulary = await _enrich_missing_phonetics(normalized_vocabulary)

    return generated.model_copy(
        update={
            "vocabulary": normalized_vocabulary,
            "grammar": normalized_grammar,
            "content": content_items,
        }
    )


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
    recent_topics = [
        topic for article in recent_articles if (topic := extract_recent_topic(article))
    ]

    completed_lessons_result = await db.execute(
        select(func.count())
        .select_from(Article)
        .where(Article.user_id == user_id)
        .where(Article.is_completed.is_(True))
    )
    completed_lessons = int(completed_lessons_result.scalar_one())

    vocabulary_count_result = await db.execute(
        select(func.count()).select_from(Vocabulary).where(Vocabulary.user_id == user_id)
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
