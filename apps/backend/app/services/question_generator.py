"""
游乐园题目生成服务
"""

from __future__ import annotations

import hashlib
import random
import re
from dataclasses import dataclass
from datetime import date
from typing import Any
from urllib.parse import quote

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.article import Article
from app.models.mistake_book import MistakeBookEntry
from app.models.vocabulary import Vocabulary


class QuestionType:
    AUDIO = "audio"
    MEANING = "meaning"
    FILL_BLANK = "fill_blank"
    CONTEXT_CLOZE = "context_cloze"
    SENTENCE_DICTATION = "sentence_dictation"


WORD_PATTERN = re.compile(r"[A-Za-z]+(?:['-][A-Za-z]+)?")


@dataclass
class Question:
    word: str
    meaning: str
    type: str
    uk_phonetic: str | None = None
    us_phonetic: str | None = None
    sentence: str | None = None
    sentence_translation: str | None = None
    word_audio_url: str | None = None
    sentence_audio_url: str | None = None

    def __post_init__(self) -> None:
        digest = hashlib.md5(
            f"{self.type}:{self.word}:{random.random()}".encode("utf-8")
        ).hexdigest()[:12]
        self.id = f"{self.type}_{digest}"
        self.hint = self._build_hint()

    def _build_hint(self) -> str:
        tokens = WORD_PATTERN.findall(self.word)
        if len(tokens) >= 2:
            preview = []
            for token in tokens[:4]:
                preview.append(token[0] + "_" * max(1, min(len(token) - 1, 2)))
            return " / ".join(preview)

        if len(self.word) <= 2:
            return self.word[:1]
        return self.word[0] + "_" * (len(self.word) - 1)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "type": self.type,
            "word": self.word,
            "meaning": self.meaning,
            "hint": self.hint,
            "uk_phonetic": self.uk_phonetic,
            "us_phonetic": self.us_phonetic,
            "sentence": self.sentence,
            "sentence_translation": self.sentence_translation,
            "word_audio_url": self.word_audio_url,
            "sentence_audio_url": self.sentence_audio_url,
        }


def build_audio_url(text: str, voice: str = "en-US-ChristopherNeural", speed: float = 1.0) -> str:
    encoded_text = quote(text, safe="")
    return f"/api/v1/tts/audio?word={encoded_text}&voice={voice}&speed={speed}"


class QuestionGenerator:
    """优先基于今日内容、错题本与历史内容生成题目。"""

    TARGET_COUNT = 50
    TYPE_DISTRIBUTION = {
        QuestionType.AUDIO: 14,
        QuestionType.MEANING: 12,
        QuestionType.FILL_BLANK: 10,
        QuestionType.CONTEXT_CLOZE: 8,
        QuestionType.SENTENCE_DICTATION: 6,
    }
    DEFAULT_VOICE = "en-US-ChristopherNeural"

    def __init__(self, db: AsyncSession, user_id: int):
        self.db = db
        self.user_id = user_id

    async def generate(self) -> list[Question]:
        words = await self._collect_words()
        sentences = await self._collect_sentences()
        dictation_sentences = await self._collect_dictation_sentences(sentences)

        if not words and not dictation_sentences:
            return []

        random.shuffle(words)
        random.shuffle(sentences)
        random.shuffle(dictation_sentences)

        questions: list[Question] = []
        cursor = 0

        questions.extend(
            self._build_word_questions(
                words[cursor : cursor + self.TYPE_DISTRIBUTION[QuestionType.AUDIO]],
                QuestionType.AUDIO,
                sentences,
            )
        )
        cursor += self.TYPE_DISTRIBUTION[QuestionType.AUDIO]

        questions.extend(
            self._build_word_questions(
                words[cursor : cursor + self.TYPE_DISTRIBUTION[QuestionType.MEANING]],
                QuestionType.MEANING,
                sentences,
            )
        )
        cursor += self.TYPE_DISTRIBUTION[QuestionType.MEANING]

        questions.extend(
            self._build_word_questions(
                words[cursor : cursor + self.TYPE_DISTRIBUTION[QuestionType.FILL_BLANK]],
                QuestionType.FILL_BLANK,
                sentences,
            )
        )
        cursor += self.TYPE_DISTRIBUTION[QuestionType.FILL_BLANK]

        questions.extend(
            self._build_word_questions(
                words[cursor : cursor + self.TYPE_DISTRIBUTION[QuestionType.CONTEXT_CLOZE]],
                QuestionType.CONTEXT_CLOZE,
                sentences,
            )
        )

        questions.extend(
            self._build_sentence_dictation_questions(
                dictation_sentences[: self.TYPE_DISTRIBUTION[QuestionType.SENTENCE_DICTATION]]
            )
        )

        random.shuffle(questions)
        return questions[: self.TARGET_COUNT]

    def _build_word_questions(
        self,
        words: list[dict[str, Any]],
        question_type: str,
        sentences: list[dict[str, str]],
    ) -> list[Question]:
        items: list[Question] = []
        for word_data in words:
            if question_type == QuestionType.AUDIO:
                items.append(
                    Question(
                        word=word_data["word"],
                        meaning=word_data["meaning"],
                        type=question_type,
                        uk_phonetic=word_data.get("uk_phonetic"),
                        us_phonetic=word_data.get("us_phonetic"),
                        word_audio_url=build_audio_url(word_data["word"], self.DEFAULT_VOICE),
                    )
                )
                continue

            if question_type == QuestionType.MEANING:
                items.append(
                    Question(
                        word=word_data["word"],
                        meaning=word_data["meaning"],
                        type=question_type,
                        uk_phonetic=word_data.get("uk_phonetic"),
                        us_phonetic=word_data.get("us_phonetic"),
                        word_audio_url=build_audio_url(word_data["word"], self.DEFAULT_VOICE),
                    )
                )
                continue

            sentence_pair = self._find_sentence_with_word(word_data["word"], sentences)
            if sentence_pair:
                sentence_en = sentence_pair["en"]
                sentence_zh = sentence_pair["zh"]
                sentence_with_blank = self._replace_word_with_blank(sentence_en, word_data["word"])
            else:
                sentence_en = f"I use the word {word_data['word']} here."
                sentence_zh = f"请填入这个单词：{word_data['meaning']}"
                sentence_with_blank = sentence_en.replace(word_data["word"], "_____")

            items.append(
                Question(
                    word=word_data["word"],
                    meaning=word_data["meaning"],
                    type=question_type,
                    uk_phonetic=word_data.get("uk_phonetic"),
                    us_phonetic=word_data.get("us_phonetic"),
                    sentence=sentence_with_blank,
                    sentence_translation=sentence_zh,
                    word_audio_url=build_audio_url(word_data["word"], self.DEFAULT_VOICE),
                    sentence_audio_url=build_audio_url(sentence_en, self.DEFAULT_VOICE),
                )
            )

        return items

    def _build_sentence_dictation_questions(
        self,
        sentences: list[dict[str, str]],
    ) -> list[Question]:
        items: list[Question] = []
        for sentence_pair in sentences:
            sentence_en = sentence_pair["en"]
            sentence_zh = sentence_pair["zh"]
            items.append(
                Question(
                    word=sentence_en,
                    meaning=sentence_zh,
                    type=QuestionType.SENTENCE_DICTATION,
                    sentence=sentence_en,
                    sentence_translation=sentence_zh,
                    sentence_audio_url=build_audio_url(sentence_en, self.DEFAULT_VOICE, speed=0.92),
                )
            )
        return items

    async def _collect_words(self) -> list[dict[str, Any]]:
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

    async def _collect_sentences(self) -> list[dict[str, str]]:
        result = await self.db.execute(
            select(Article)
            .where(Article.user_id == self.user_id)
            .order_by(desc(Article.publish_date))
            .limit(20)
        )
        articles = result.scalars().all()
        sentences: list[dict[str, str]] = []
        for article in articles:
            for item in article.content or []:
                if item.get("en") and item.get("zh"):
                    sentences.append({"en": item["en"], "zh": item["zh"]})
        return sentences

    async def _collect_dictation_sentences(
        self,
        article_sentences: list[dict[str, str]],
    ) -> list[dict[str, str]]:
        dedup: dict[str, dict[str, str]] = {}

        for item in await self._get_mistake_sentences():
            normalized = item["en"].strip().lower()
            if normalized and self._is_dictation_candidate(item["en"]):
                dedup[normalized] = item

        for item in article_sentences:
            normalized = item["en"].strip().lower()
            if normalized in dedup:
                continue
            if self._is_dictation_candidate(item["en"]):
                dedup[normalized] = item

        return list(dedup.values())

    async def _get_mistake_words(self) -> list[dict[str, Any]]:
        result = await self.db.execute(
            select(MistakeBookEntry)
            .where(MistakeBookEntry.user_id == self.user_id)
            .where(MistakeBookEntry.item_type.in_(["word", "exercise"]))
            .where(MistakeBookEntry.is_mastered.is_(False))
            .order_by(desc(MistakeBookEntry.last_seen_at), desc(MistakeBookEntry.mistake_count))
            .limit(24)
        )
        entries = result.scalars().all()
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
        result = await self.db.execute(
            select(MistakeBookEntry)
            .where(MistakeBookEntry.user_id == self.user_id)
            .where(MistakeBookEntry.item_type.in_(["sentence", "exercise"]))
            .where(MistakeBookEntry.is_mastered.is_(False))
            .order_by(desc(MistakeBookEntry.last_seen_at), desc(MistakeBookEntry.mistake_count))
            .limit(12)
        )
        entries = result.scalars().all()
        items: list[dict[str, str]] = []
        for entry in entries:
            if not self._is_dictation_candidate(entry.target_text):
                continue
            items.append(
                {
                    "en": entry.target_text.strip(),
                    "zh": (entry.prompt_text or entry.context_text or "请回忆这句英文").strip(),
                }
            )
        return items

    async def _get_today_article_words(self) -> list[dict[str, Any]]:
        today = date.today()
        result = await self.db.execute(
            select(Article)
            .where(Article.user_id == self.user_id)
            .where(Article.publish_date == today)
        )
        article = result.scalar_one_or_none()
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
        result = await self.db.execute(
            select(Vocabulary)
            .where(Vocabulary.user_id == self.user_id)
            .order_by(desc(Vocabulary.created_at))
            .limit(limit * 2)
        )
        vocabularies = result.scalars().all()
        words: list[dict[str, Any]] = []
        for vocab in vocabularies:
            normalized = vocab.word.lower()
            if normalized in exclude:
                continue
            words.append(
                {
                    "word": vocab.word,
                    "meaning": vocab.meaning,
                    "uk_phonetic": vocab.uk_phonetic,
                    "us_phonetic": vocab.us_phonetic,
                    "source": "vocabulary",
                }
            )
            exclude.add(normalized)
            if len(words) >= limit:
                break
        return words

    async def _get_history_article_words(self, *, exclude: set[str], limit: int) -> list[dict[str, Any]]:
        result = await self.db.execute(
            select(Article)
            .where(Article.user_id == self.user_id)
            .where(Article.vocabulary.is_not(None))
            .order_by(desc(Article.publish_date))
            .limit(12)
        )
        articles = result.scalars().all()
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
    def _find_sentence_with_word(word: str, sentences: list[dict[str, str]]) -> dict[str, str] | None:
        pattern = r"\b" + re.escape(word.lower()) + r"\b"
        shuffled = sentences.copy()
        random.shuffle(shuffled)
        for sentence in shuffled:
            if re.search(pattern, sentence["en"].lower()):
                return sentence
        return None

    @staticmethod
    def _replace_word_with_blank(sentence: str, word: str) -> str:
        pattern = r"\b" + re.escape(word) + r"\b"
        return re.sub(pattern, "_____", sentence, flags=re.IGNORECASE)

    @staticmethod
    def _is_dictation_candidate(sentence: str) -> bool:
        tokens = WORD_PATTERN.findall(sentence)
        return 3 <= len(tokens) <= 12 and len(sentence.strip()) <= 120


async def generate_questions(db: AsyncSession, user_id: int) -> list[Question]:
    generator = QuestionGenerator(db, user_id)
    return await generator.generate()
