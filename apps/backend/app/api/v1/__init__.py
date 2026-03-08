"""
API V1 路由聚合
"""

from fastapi import APIRouter

from app.api.v1 import article, auth, note, study_log, system, user, vocabulary

api_router = APIRouter(prefix="/v1")

api_router.include_router(auth.router)
api_router.include_router(user.router)
api_router.include_router(article.router)
api_router.include_router(note.router)
api_router.include_router(vocabulary.router)
api_router.include_router(study_log.router)
api_router.include_router(system.router)
