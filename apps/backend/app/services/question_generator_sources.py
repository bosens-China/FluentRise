"""
游乐园出题素材收集器。
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.time import app_today
from app.repositories.article_repository import (
    get_user_article_by_publish_date,
    list_recent_user_articles,
)
from app.repositories.mistake_book_repository import list_recent_unmastered_mistakes
from app.repositories.vocabulary_repository import list_user_vocabulary_entries
from app.services.question_generator_models import WORD_PATTERN


class QuestionMaterialCollector:
    """负责收集单词、例句和默写句子素材。"""

    TARGET_COUNT = 15

    def __init__(self, db: AsyncSession, user_id: int):
        self.db = db
        self.user_id = user_id

    async def collect_words(self) -> list[dict[str, Any]]:
        words: list[dict[str, Any]] = []
        word_set: set[str] = set()

        for source in (
            await self._get_mistake_words(),
            await self._get_today_article_words(),
            await self._get_vocabulary_words(exclude=word_set, limit=self.TARGET_COUNT),
            await self._get_history_article_words(exclude=word_set, limit=self.TARGET_COUNT),
        ):
            for word_data in source:
                normalized = word_data["word"].lower()
                if normalized in word_set:
                    continue
                words.append(word_data)
                word_set.add(normalized)
                if len(words) >= self.TARGET_COUNT:
                    return words

        return words

    async def collect_sentences(self) -> list[dict[str, str]]:
        articles = await list_recent_user_articles(self.db, user_id=self.user_id, limit=20)
        sentences: list[dict[str, str]] = []
        for article in articles:
            for item in article.content or []:
                if item.get("en") and item.get("zh"):
                    sentences.append({"en": item["en"], "zh": item["zh"]})
        return sentences

    async def collect_dictation_sentences(
        self,
        article_sentences: list[dict[str, str]],
    ) -> list[dict[str, str]]:
        dedup: dict[str, dict[str, str]] = {}

        for item in await self._get_mistake_sentences():
            normalized = item["en"].strip().lower()
            if normalized and self.is_dictation_candidate(item["en"]):
                dedup[normalized] = item

        for item in article_sentences:
            normalized = item["en"].strip().lower()
            if normalized in dedup:
                continue
            if self.is_dictation_candidate(item["en"]):
                dedup[normalized] = item

        return list(dedup.values())

    async def _get_mistake_words(self) -> list[dict[str, Any]]:
        entries = await list_recent_unmastered_mistakes(
            self.db,
            user_id=self.user_id,
            item_types=["word", "exercise"],
            limit=24,
        )

        words: list[dict[str, Any]] = []
        for entry in entries:
            if " " in entry.target_text.strip():
                continue
            payload = entry.payload or {}
            words.append(
                {
                    "word": entry.target_text,
                    "meaning": payload.get("meaning", entry.prompt_text or ""),
                    "uk_phonetic": payload.get("uk_phonetic"),
                    "us_phonetic": payload.get("us_phonetic"),
                    "source": "mistake_book",
                }
            )
        return words

    async def _get_mistake_sentences(self) -> list[dict[str, str]]:
        entries = await list_recent_unmastered_mistakes(
            self.db,
            user_id=self.user_id,
            item_types=["sentence", "exercise"],
            limit=12,
        )

        items: list[dict[str, str]] = []
        for entry in entries:
            if not self.is_dictation_candidate(entry.target_text):
                continue
            items.append(
                {
                    "en": entry.target_text.strip(),
                    "zh": (entry.prompt_text or entry.context_text or "请回忆这句英文").strip(),
                }
            )
        return items

    async def _get_today_article_words(self) -> list[dict[str, Any]]:
        today = app_today()
        article = await get_user_article_by_publish_date(
            self.db,
            user_id=self.user_id,
            publish_date=today,
        )
        if article is None or not article.vocabulary:
            return []

        return [
            {
                "word": vocab["word"],
                "meaning": vocab["meaning"],
                "uk_phonetic": vocab.get("uk_phonetic"),
                "us_phonetic": vocab.get("us_phonetic"),
                "source": "today_article",
            }
            for vocab in article.vocabulary
        ]

    async def _get_vocabulary_words(self, *, exclude: set[str], limit: int) -> list[dict[str, Any]]:
        vocabularies = await list_user_vocabulary_entries(
            self.db,
            user_id=self.user_id,
            limit=limit * 2,
        )
        words: list[dict[str, Any]] = []
        for vocabulary in vocabularies:
            normalized = vocabulary.word.lower()
            if normalized in exclude:
                continue
            words.append(
                {
                    "word": vocabulary.word,
                    "meaning": vocabulary.meaning,
                    "uk_phonetic": vocabulary.uk_phonetic,
                    "us_phonetic": vocabulary.us_phonetic,
                    "source": "vocabulary",
                }
            )
            exclude.add(normalized)
            if len(words) >= limit:
                break
        return words

    async def _get_history_article_words(
        self,
        *,
        exclude: set[str],
        limit: int,
    ) -> list[dict[str, Any]]:
        articles = await list_recent_user_articles(self.db, user_id=self.user_id, limit=12)
        words: list[dict[str, Any]] = []
        for article in articles:
            for vocab in article.vocabulary or []:
                normalized = vocab["word"].lower()
                if normalized in exclude:
                    continue
                words.append(
                    {
                        "word": vocab["word"],
                        "meaning": vocab["meaning"],
                        "uk_phonetic": vocab.get("uk_phonetic"),
                        "us_phonetic": vocab.get("us_phonetic"),
                        "source": "history_article",
                    }
                )
                exclude.add(normalized)
                if len(words) >= limit:
                    return words
        return words

    @staticmethod
    def is_dictation_candidate(sentence: str) -> bool:
        tokens = WORD_PATTERN.findall(sentence)
        return 3 <= len(tokens) <= 12 and len(sentence.strip()) <= 120
