"""
文章 API。
"""

from __future__ import annotations

from fastapi import APIRouter, Response

from app.api.deps import CurrentUser, DbSession, StandardPagination
from app.schemas.article import (
    ArticleAudioTimelineResponse,
    ArticleListResponse,
    ArticleResponse,
    GenerateArticleRequest,
    MiniStoryEvaluateRequest,
    MiniStoryEvaluateResponse,
    MiniStoryResponse,
    TodayArticleResponse,
    UpdateProgressRequest,
)
from app.schemas.article_proposal import LearningPathResponse
from app.services.article_content_service import (
    generate_article_audio_bytes,
    get_article_audio_timeline,
    get_user_article,
)
from app.services.article_lifecycle_service import (
    generate_today_article_for_user,
    get_article_detail_response,
    get_article_history_response,
    get_today_article_response,
)
from app.services.article_progress_service import update_article_progress_for_user
from app.services.article_proposal_service import article_proposal_service
from app.services.mini_story_service import mini_story_service

router = APIRouter(prefix="/articles", tags=["文章"])


@router.get("/today", response_model=TodayArticleResponse)
async def get_today_article(
    db: DbSession,
    current_user: CurrentUser,
) -> TodayArticleResponse:
    """获取今天的文章。"""
    return await get_today_article_response(db, current_user=current_user)


@router.post("/today/generate", response_model=ArticleResponse)
async def generate_today_article(
    db: DbSession,
    current_user: CurrentUser,
    request: GenerateArticleRequest | None = None,
) -> ArticleResponse:
    """生成或重新生成今天的文章。"""
    article = await generate_today_article_for_user(
        db,
        current_user=current_user,
        request=request,
    )
    return ArticleResponse.model_validate(article)


@router.get("/path", response_model=LearningPathResponse)
async def get_learning_path(
    db: DbSession,
    current_user: CurrentUser,
) -> LearningPathResponse:
    """获取学习路径。"""
    payload = await article_proposal_service.get_learning_path(db, user_id=current_user.id)
    return LearningPathResponse.model_validate(payload)


@router.post("/proposals/{proposal_id}/realize", response_model=ArticleResponse)
async def realize_article_proposal(
    proposal_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> ArticleResponse:
    """将学习路径中的建议节点转化为正式文章。"""
    article = await article_proposal_service.realize_proposal(
        db,
        user_id=current_user.id,
        proposal_id=proposal_id,
    )
    return ArticleResponse.model_validate(article)


@router.get("/history", response_model=ArticleListResponse)
async def get_article_history(
    pagination: StandardPagination,
    db: DbSession,
    current_user: CurrentUser,
) -> ArticleListResponse:
    """获取历史文章。"""
    return await get_article_history_response(
        db,
        user_id=current_user.id,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.get("/{article_id}", response_model=ArticleResponse)
async def get_article_detail(
    article_id: int,
    response: Response,
    db: DbSession,
    current_user: CurrentUser,
) -> ArticleResponse:
    """获取文章详情。"""
    response.headers["Cache-Control"] = "private, max-age=604800"
    return await get_article_detail_response(
        db,
        user_id=current_user.id,
        article_id=article_id,
    )


@router.post("/{article_id}/audio")
async def generate_article_audio(
    article_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> Response:
    """生成文章音频。"""
    audio_bytes = await generate_article_audio_bytes(
        db,
        user_id=current_user.id,
        article_id=article_id,
    )
    return Response(
        content=audio_bytes,
        media_type="audio/mpeg",
        headers={
            "Cache-Control": "private, max-age=2592000, immutable",
            "Content-Disposition": f'inline; filename="article_{article_id}.mp3"',
        },
    )


@router.get("/{article_id}/audio-timeline", response_model=ArticleAudioTimelineResponse)
async def get_article_audio_timeline_endpoint(
    article_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> ArticleAudioTimelineResponse:
    """获取文章整篇音频时间轴。"""
    return await get_article_audio_timeline(
        db,
        user_id=current_user.id,
        article_id=article_id,
    )


@router.patch("/{article_id}/progress", response_model=ArticleResponse)
async def update_article_progress(
    article_id: int,
    request: UpdateProgressRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> ArticleResponse:
    """更新文章阅读进度和练习结果。"""
    article = await update_article_progress_for_user(
        db,
        user_id=current_user.id,
        article_id=article_id,
        request=request,
    )
    return ArticleResponse.model_validate(article)


@router.post("/{article_id}/mini-story/generate", response_model=MiniStoryResponse)
async def generate_article_mini_story(
    article_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> MiniStoryResponse:
    """生成本课变种小故事及问答题。"""
    article = await get_user_article(db, user_id=current_user.id, article_id=article_id)
    return await mini_story_service.generate_story(article)


@router.post("/{article_id}/mini-story/evaluate", response_model=MiniStoryEvaluateResponse)
async def evaluate_article_mini_story(
    article_id: int,
    request: MiniStoryEvaluateRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> MiniStoryEvaluateResponse:
    """校验小故事概述问答。"""
    await get_user_article(db, user_id=current_user.id, article_id=article_id)
    return await mini_story_service.evaluate_answers(
        story_en=request.story_en,
        questions=request.questions,
        answers=request.answers,
    )
