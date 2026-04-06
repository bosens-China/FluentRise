"""
游乐园题目生成服务。
"""

from __future__ import annotations

import random
import re
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.question_generator_models import (
    Question,
    QuestionType,
    build_audio_url,
)
from app.services.question_generator_sources import QuestionMaterialCollector


class QuestionGenerator:
    """优先基于今日内容、错题本与历史内容生成题目。"""

    TARGET_COUNT = 15
    TYPE_DISTRIBUTION = {
        QuestionType.AUDIO: 4,
        QuestionType.MEANING: 4,
        QuestionType.FILL_BLANK: 3,
        QuestionType.CONTEXT_CLOZE: 2,
        QuestionType.SENTENCE_DICTATION: 2,
    }
    DEFAULT_VOICE = "en-US-ChristopherNeural"

    def __init__(self, db: AsyncSession, user_id: int):
        self.collector = QuestionMaterialCollector(db, user_id)

    async def generate(self) -> list[Question]:
        words = await self.collector.collect_words()
        sentences = await self.collector.collect_sentences()
        dictation_sentences = await self.collector.collect_dictation_sentences(sentences)

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
            if question_type in {QuestionType.AUDIO, QuestionType.MEANING}:
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
        self, sentences: list[dict[str, str]]
    ) -> list[Question]:
        return [
            Question(
                word=sentence_pair["en"],
                meaning=sentence_pair["zh"],
                type=QuestionType.SENTENCE_DICTATION,
                sentence=sentence_pair["en"],
                sentence_translation=sentence_pair["zh"],
                sentence_audio_url=build_audio_url(
                    sentence_pair["en"],
                    self.DEFAULT_VOICE,
                    speed=0.92,
                ),
            )
            for sentence_pair in sentences
        ]

    @staticmethod
    def _find_sentence_with_word(
        word: str,
        sentences: list[dict[str, str]],
    ) -> dict[str, str] | None:
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


async def generate_questions(db: AsyncSession, user_id: int) -> list[Question]:
    generator = QuestionGenerator(db, user_id)
    return await generator.generate()
