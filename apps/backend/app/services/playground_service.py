"""
游乐园训练服务。
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.practice_session import PracticeSession
from app.repositories.practice_repository import (
    count_practice_sessions,
    get_practice_stats_row,
    list_practice_sessions,
)
from app.schemas.playground import (
    PracticeHistoryResponse,
    PracticeSessionResponse,
    PracticeStatsResponse,
    SubmitPracticeRequest,
    SubmitPracticeResponse,
)
from app.schemas.user import UserInfo
from app.services.encouragement_service import encouragement_service
from app.services.mistake_service import mistake_service
from app.services.study_log_service import study_log_service


class PlaygroundService:
    """游乐园训练服务。"""

    @staticmethod
    async def submit_practice(
        *,
        db: AsyncSession,
        current_user: UserInfo,
        request: SubmitPracticeRequest,
    ) -> SubmitPracticeResponse:
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
            context_text = (
                item.sentence if item.question_type in {"fill_blank", "context_cloze"} else None
            )

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

    @staticmethod
    async def get_practice_history(
        *,
        db: AsyncSession,
        user_id: int,
        page: int,
        page_size: int,
    ) -> PracticeHistoryResponse:
        total = await count_practice_sessions(db, user_id=user_id)
        sessions = await list_practice_sessions(
            db,
            user_id=user_id,
            page=page,
            page_size=page_size,
        )

        return PracticeHistoryResponse(
            sessions=[
                PracticeSessionResponse(
                    id=session.id,
                    total_questions=session.total_questions,
                    correct_count=session.correct_count,
                    wrong_count=session.wrong_count,
                    skipped_count=session.skipped_count,
                    accuracy=round(session.correct_count / session.total_questions * 100, 1)
                    if session.total_questions > 0
                    else 0,
                    duration_seconds=session.duration_seconds,
                    max_streak=session.max_streak,
                    created_at=session.created_at,
                )
                for session in sessions
            ],
            total=total,
        )

    @staticmethod
    async def get_practice_stats(*, db: AsyncSession, user_id: int) -> PracticeStatsResponse:
        row = await get_practice_stats_row(db, user_id=user_id)

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
        overall_accuracy = (
            round(total_correct / total_questions * 100, 1) if total_questions > 0 else 0
        )

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


playground_service = PlaygroundService()
