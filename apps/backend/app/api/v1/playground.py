"""
游乐园 API
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.practice_session import PracticeSession
from app.schemas.user import UserInfo
from app.services.encouragement_service import encouragement_service
from app.services.mistake_service import mistake_service
from app.services.question_generator import generate_questions
from app.services.study_log_service import study_log_service

router = APIRouter(prefix="/playground", tags=["游乐园"])


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


@router.get("/questions", response_model=QuestionListResponse)
async def get_questions(
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """获取游乐园题目。"""
    questions = await generate_questions(db, current_user.id)
    if not questions:
        raise HTTPException(
            status_code=404,
            detail="暂无足够内容生成题目，请先完成今日学习或积累一些生词",
        )

    return QuestionListResponse(
        questions=[QuestionResponse(**question.to_dict()) for question in questions],
        total=len(questions),
    )


@router.post("/submit", response_model=SubmitPracticeResponse)
async def submit_practice(
    request: SubmitPracticeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """提交游乐园练习结果。"""
    total = len(request.answers)
    correct = sum(1 for item in request.answers if item.is_correct)
    skipped = sum(1 for item in request.answers if item.showed_answer)
    wrong = max(0, total - correct - skipped)
    accuracy = round(correct / total * 100, 1) if total > 0 else 0.0

    details = [
        {
            "word": item.word,
            "meaning": item.meaning,
            "is_correct": item.is_correct,
            "attempts": item.attempts,
            "showed_answer": item.showed_answer,
        }
        for item in request.answers
    ]

    session = PracticeSession(
        user_id=current_user.id,
        total_questions=total,
        correct_count=correct,
        wrong_count=wrong,
        skipped_count=skipped,
        duration_seconds=request.duration_seconds,
        max_streak=request.max_streak,
        details=details,
    )
    db.add(session)
    await db.flush()

    for item in request.answers:
        metadata = {
            "meaning": item.meaning,
            "uk_phonetic": item.uk_phonetic,
            "us_phonetic": item.us_phonetic,
            "question_type": item.question_type,
            "sentence": item.sentence,
            "sentence_translation": item.sentence_translation,
        }
        item_type = "sentence" if item.question_type == "sentence_dictation" else "word"
        prompt_text = (
            item.sentence_translation
            if item.question_type == "sentence_dictation"
            else item.meaning
        )
        context_text = item.sentence if item.question_type in {"fill_blank", "context_cloze"} else None
        if item.is_correct:
            await mistake_service.mark_mastered(
                db,
                user_id=current_user.id,
                item_type=item_type,
                target_text=item.word,
            )
            continue

        await mistake_service.record_mistake(
            db,
            user_id=current_user.id,
            source_type="playground",
            item_type=item_type,
            target_text=item.word,
            prompt_text=prompt_text,
            user_answer=item.user_answer,
            context_text=context_text,
            metadata=metadata,
        )

    streak_data = await study_log_service.get_streak(db, current_user.id)
    encouragement = await encouragement_service.generate(
        context_type="playground",
        user_level=current_user.english_level,
        accuracy=accuracy,
        streak_days=streak_data.streak_days,
    )

    await db.commit()
    await db.refresh(session)
    await study_log_service.check_in(db, current_user.id, course_title="游乐园训练")

    return SubmitPracticeResponse(
        session_id=session.id,
        total=total,
        correct=correct,
        wrong=wrong,
        skipped=skipped,
        accuracy=accuracy,
        message=encouragement.zh,
        encouragement_zh=encouragement.zh,
        encouragement_en=encouragement.en,
    )


@router.get("/history", response_model=PracticeHistoryResponse)
async def get_practice_history(
    page: int = 1,
    page_size: int = 10,
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """获取游乐园历史记录。"""
    count_result = await db.execute(
        select(func.count())
        .select_from(PracticeSession)
        .where(PracticeSession.user_id == current_user.id)
    )
    total = count_result.scalar() or 0

    result = await db.execute(
        select(PracticeSession)
        .where(PracticeSession.user_id == current_user.id)
        .order_by(desc(PracticeSession.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    sessions = result.scalars().all()

    return PracticeHistoryResponse(
        sessions=[
            PracticeSessionResponse(
                id=session.id,
                total_questions=session.total_questions,
                correct_count=session.correct_count,
                wrong_count=session.wrong_count,
                skipped_count=session.skipped_count,
                accuracy=round(session.correct_count / session.total_questions * 100, 1) if session.total_questions > 0 else 0,
                duration_seconds=session.duration_seconds,
                max_streak=session.max_streak,
                created_at=session.created_at,
            )
            for session in sessions
        ],
        total=total,
    )


@router.get("/stats", response_model=PracticeStatsResponse)
async def get_practice_stats(
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """获取游乐园统计。"""
    result = await db.execute(
        select(
            func.count().label("total_sessions"),
            func.sum(PracticeSession.total_questions).label("total_questions"),
            func.sum(PracticeSession.correct_count).label("total_correct"),
            func.sum(PracticeSession.wrong_count).label("total_wrong"),
            func.sum(PracticeSession.skipped_count).label("total_skipped"),
            func.sum(PracticeSession.duration_seconds).label("total_duration"),
            func.max(PracticeSession.max_streak).label("best_streak"),
        ).where(PracticeSession.user_id == current_user.id)
    )
    row = result.one_or_none()

    if not row or row.total_sessions == 0:
        return PracticeStatsResponse(
            total_sessions=0,
            total_questions=0,
            total_correct=0,
            total_wrong=0,
            total_skipped=0,
            overall_accuracy=0,
            total_duration_minutes=0,
            best_streak=0,
        )

    total_questions = row.total_questions or 0
    total_correct = row.total_correct or 0
    overall_accuracy = round(total_correct / total_questions * 100, 1) if total_questions > 0 else 0

    return PracticeStatsResponse(
        total_sessions=row.total_sessions,
        total_questions=total_questions,
        total_correct=total_correct,
        total_wrong=row.total_wrong or 0,
        total_skipped=row.total_skipped or 0,
        overall_accuracy=overall_accuracy,
        total_duration_minutes=(row.total_duration or 0) // 60,
        best_streak=row.best_streak or 0,
    )
