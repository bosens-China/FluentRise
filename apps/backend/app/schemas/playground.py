"""
游乐园训练相关数据模型。
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class QuestionResponse(BaseModel):
    id: str
    type: str
    word: str
    meaning: str
    hint: str
    uk_phonetic: str | None = None
    us_phonetic: str | None = None
    sentence: str | None = None
    sentence_translation: str | None = None
    word_audio_url: str | None = None
    sentence_audio_url: str | None = None


class QuestionListResponse(BaseModel):
    questions: list[QuestionResponse]
    total: int


class SubmitAnswerItem(BaseModel):
    question_id: str
    question_type: str
    word: str
    meaning: str | None = None
    uk_phonetic: str | None = None
    us_phonetic: str | None = None
    sentence: str | None = None
    sentence_translation: str | None = None
    user_answer: str | None = None
    is_correct: bool
    attempts: int = Field(default=1, ge=1, le=3)
    showed_answer: bool = False


class SubmitPracticeRequest(BaseModel):
    answers: list[SubmitAnswerItem]
    duration_seconds: int = Field(..., ge=0)
    max_streak: int = Field(default=0, ge=0)


class SubmitPracticeResponse(BaseModel):
    session_id: int
    total: int
    correct: int
    wrong: int
    skipped: int
    accuracy: float
    message: str
    encouragement_zh: str
    encouragement_en: str


class PracticeSessionResponse(BaseModel):
    id: int
    total_questions: int
    correct_count: int
    wrong_count: int
    skipped_count: int
    accuracy: float
    duration_seconds: int
    max_streak: int
    created_at: datetime


class PracticeHistoryResponse(BaseModel):
    sessions: list[PracticeSessionResponse]
    total: int


class PracticeStatsResponse(BaseModel):
    total_sessions: int
    total_questions: int
    total_correct: int
    total_wrong: int
    total_skipped: int
    overall_accuracy: float
    total_duration_minutes: int
    best_streak: int
