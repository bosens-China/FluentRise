"""
生词 API 路由
"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.schemas.vocabulary import VocabularyTimelineResponse
from app.services.vocabulary_service import get_vocabulary_timeline_response

router = APIRouter(prefix="/vocabularies", tags=["生词本"])


@router.get("/timeline", response_model=VocabularyTimelineResponse)
async def get_vocabulary_timeline(
    db: DbSession,
    current_user: CurrentUser,
) -> VocabularyTimelineResponse:
    """
    获取用户的生词本（按时间线排列）
    """
    return await get_vocabulary_timeline_response(db, user_id=current_user.id)
