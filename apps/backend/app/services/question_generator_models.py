"""
游乐园题目生成相关模型。
"""

from __future__ import annotations

import hashlib
import random
import re
from dataclasses import dataclass, field
from typing import Any
from urllib.parse import quote


class QuestionType:
    AUDIO = "audio"
    MEANING = "meaning"
    FILL_BLANK = "fill_blank"
    CONTEXT_CLOZE = "context_cloze"
    SENTENCE_DICTATION = "sentence_dictation"


WORD_PATTERN = re.compile(r"[A-Za-z]+(?:['-][A-Za-z]+)?")


@dataclass(slots=True)
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
    id: str = field(init=False)
    hint: str = field(init=False)

    def __post_init__(self) -> None:
        digest = hashlib.md5(
            f"{self.type}:{self.word}:{random.random()}".encode("utf-8")
        ).hexdigest()[:12]
        self.id = f"{self.type}_{digest}"
        self.hint = self._build_hint()

    def _build_hint(self) -> str:
        tokens = WORD_PATTERN.findall(self.word)
        if len(tokens) >= 2:
            previews = [token[0] + "_" * max(1, min(len(token) - 1, 2)) for token in tokens[:4]]
            return " / ".join(previews)

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
