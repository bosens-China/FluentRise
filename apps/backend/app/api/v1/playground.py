"""
游乐园训练路由。
"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession, StandardPagination
from app.core.exceptions import NotFoundError
from app.schemas.playground import (
    PracticeHistoryResponse,
    PracticeStatsResponse,
    QuestionListResponse,
    QuestionResponse,
    SubmitPracticeRequest,
    SubmitPracticeResponse,
)
from app.services.playground_service import playground_service
from app.services.question_generator import generate_questions

router = APIRouter(prefix="/playground", tags=["游乐园"])


@router.get("/questions", response_model=QuestionListResponse, summary="获取训练题目")
async def get_questions(
    db: DbSession,
    current_user: CurrentUser,
) -> QuestionListResponse:
    questions = await generate_questions(db, current_user.id)
    if not questions:
        raise NotFoundError("暂无足够内容生成题目，请先完成今天的学习或积累一些生词")

    return QuestionListResponse(
        questions=[QuestionResponse(**question.to_dict()) for question in questions],
        total=len(questions),
    )


@router.post("/submit", response_model=SubmitPracticeResponse, summary="提交训练结果")
async def submit_practice(
    request: SubmitPracticeRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> SubmitPracticeResponse:
    return await playground_service.submit_practice(
        db=db,
        current_user=current_user,
        request=request,
    )


@router.get("/history", response_model=PracticeHistoryResponse, summary="获取训练历史")
async def get_practice_history(
    pagination: StandardPagination,
    db: DbSession,
    current_user: CurrentUser,
) -> PracticeHistoryResponse:
    return await playground_service.get_practice_history(
        db=db,
        user_id=current_user.id,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get("/stats", response_model=PracticeStatsResponse, summary="获取训练统计")
async def get_practice_stats(
    db: DbSession,
    current_user: CurrentUser,
) -> PracticeStatsResponse:
    return await playground_service.get_practice_stats(db=db, user_id=current_user.id)
