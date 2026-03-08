"""
API V1 路由聚合
"""

from fastapi import APIRouter

from app.api.v1 import article, auth, note, user, vocabulary

api_router = APIRouter(prefix="/v1")

api_router.include_router(auth.router)
api_router.include_router(user.router)
api_router.include_router(article.router)
api_router.include_router(note.router)
api_router.include_router(vocabulary.router)
