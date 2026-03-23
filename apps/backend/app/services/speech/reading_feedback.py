"""
朗读反馈计算
"""

from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass
from difflib import SequenceMatcher
from typing import Literal

ConfidenceLevel = Literal["high", "medium", "low"]

CONTRACTION_MAP: dict[str, str] = {
    "i'm": "i am",
    "you're": "you are",
    "we're": "we are",
    "they're": "they are",
    "he's": "he is",
    "she's": "she is",
    "it's": "it is",
    "that's": "that is",
    "there's": "there is",
    "don't": "do not",
    "doesn't": "does not",
    "didn't": "did not",
    "can't": "can not",
    "couldn't": "could not",
    "won't": "will not",
    "wouldn't": "would not",
    "shouldn't": "should not",
    "isn't": "is not",
    "aren't": "are not",
    "wasn't": "was not",
    "weren't": "were not",
    "i've": "i have",
    "you've": "you have",
    "we've": "we have",
    "they've": "they have",
    "i'll": "i will",
    "you'll": "you will",
    "we'll": "we will",
    "they'll": "they will",
    "gonna": "going to",
    "wanna": "want to",
    "gotta": "got to",
}

SOFT_STOP_WORDS = {
    "a",
    "an",
    "the",
    "am",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "to",
    "of",
    "in",
    "on",
    "at",
    "for",
    "from",
    "and",
    "or",
    "but",
    "if",
    "then",
    "than",
    "that",
    "this",
    "these",
    "those",
    "with",
    "as",
    "by",
    "it",
    "i",
    "you",
    "he",
    "she",
    "we",
    "they",
    "me",
    "him",
    "her",
    "them",
    "my",
    "your",
    "his",
    "their",
    "our",
    "do",
    "does",
    "did",
    "have",
    "has",
    "had",
    "will",
    "would",
    "can",
    "could",
    "should",
    "may",
    "might",
    "not",
}


@dataclass
class ReadingFeedback:
    """朗读回看结果"""

    similarity_score: int
    confidence_level: ConfidenceLevel
    missing_words: list[str]
    extra_words: list[str]
    analysis_zh: str


def build_reading_feedback(reference_text: str, transcript: str) -> ReadingFeedback:
    """基于参考文本生成宽松朗读反馈"""
    full_reference_tokens = _normalize_tokens(reference_text, remove_stop_words=False)
    full_transcript_tokens = _normalize_tokens(transcript, remove_stop_words=False)
    core_reference_tokens = _normalize_tokens(reference_text, remove_stop_words=True)
    core_transcript_tokens = _normalize_tokens(transcript, remove_stop_words=True)

    if not full_reference_tokens or not full_transcript_tokens:
        return ReadingFeedback(
            similarity_score=0,
            confidence_level="low",
            missing_words=[],
            extra_words=[],
            analysis_zh="这次识别内容太短，建议把范围缩到一句或一小段再试。",
        )

    full_ratio = SequenceMatcher(None, full_reference_tokens, full_transcript_tokens).ratio()
    core_ratio = (
        SequenceMatcher(None, core_reference_tokens, core_transcript_tokens).ratio()
        if core_reference_tokens and core_transcript_tokens
        else full_ratio
    )
    weighted_score = int(round((full_ratio * 0.35 + core_ratio * 0.65) * 100))

    reference_counter = Counter(core_reference_tokens or full_reference_tokens)
    transcript_counter = Counter(core_transcript_tokens or full_transcript_tokens)
    missing_words = list((reference_counter - transcript_counter).keys())[:8]
    extra_words = list((transcript_counter - reference_counter).keys())[:8]

    confidence_level = _build_confidence_level(
        weighted_score,
        len(full_transcript_tokens),
        len(core_transcript_tokens),
    )

    return ReadingFeedback(
        similarity_score=weighted_score,
        confidence_level=confidence_level,
        missing_words=missing_words,
        extra_words=extra_words,
        analysis_zh=_build_analysis(weighted_score, confidence_level),
    )


def _build_confidence_level(
    score: int,
    transcript_length: int,
    core_length: int,
) -> ConfidenceLevel:
    """生成识别稳定度等级"""
    if transcript_length < 3 or core_length < 2 or score < 45:
        return "low"
    if transcript_length < 8 or score < 75:
        return "medium"
    return "high"


def _build_analysis(score: int, confidence_level: ConfidenceLevel) -> str:
    """生成更克制的中文分析说明"""
    if confidence_level == "low":
        return "这次识别不太稳定，建议改成一句或一小段再试，不要把它当成严格纠错结果。"
    if score >= 85:
        return "这次识别和原文整体比较接近，可以继续往下一轮跟读或回看重点词。"
    if score >= 65:
        return "这次识别和原文有不少重合，但仍有一些漏读或替换，建议放慢一点再读一遍。"
    return "这次识别和原文差距较大，建议先听参考音频，再缩短范围重读。"


def _normalize_tokens(text: str, *, remove_stop_words: bool) -> list[str]:
    """把文本规整成更适合宽松匹配的词列表"""
    normalized = text.lower()
    for raw, replacement in CONTRACTION_MAP.items():
        normalized = normalized.replace(raw, replacement)
    normalized = re.sub(r"[^a-z\s']", " ", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    tokens = re.findall(r"[a-z']+", normalized)
    if remove_stop_words:
        return [token for token in tokens if token not in SOFT_STOP_WORDS]
    return tokens
