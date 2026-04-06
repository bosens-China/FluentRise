"""
文章生命周期服务。
"""

from __future__ import annotations

import asyncio

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestError, ConflictError
from app.core.time import app_today, utc_now
from app.db.redis import get_redis
from app.models.article import Article
from app.models.learning_feedback import LearningFeedback
from app.repositories.article_repository import (
    count_user_articles,
    get_user_article_by_id,
    get_user_article_by_publish_date,
    list_user_article_history,
)
from app.schemas.article import (
    ArticleListItem,
    ArticleListResponse,
    ArticleResponse,
    GenerateArticleRequest,
    TodayArticleResponse,
)
from app.schemas.user import UserInfo
from app.services.article_generator import article_generator
from app.services.article_service import (
    apply_generated_article,
    collect_generation_context,
    normalize_generated_article,
    reconcile_article_record,
)
from app.services.tts_service import tts_service


async def get_today_article_response(
    db: AsyncSession,
    *,
    current_user: UserInfo,
) -> TodayArticleResponse:
    """获取今天的文章。"""
    today = app_today()
    article = await get_user_article_by_publish_date(db, user_id=current_user.id, publish_date=today)
    if article is None:
        return TodayArticleResponse(has_article=False, article=None)

    article = await reconcile_article_record(db, user_id=current_user.id, article=article)
    await db.commit()
    await db.refresh(article)
    return TodayArticleResponse(has_article=True, article=ArticleResponse.model_validate(article))


async def generate_today_article_for_user(
    db: AsyncSession,
    *,
    current_user: UserInfo,
    request: GenerateArticleRequest | None,
) -> Article:
    """生成或重新生成指定日期文章。"""
    target_date = request.target_date if request and request.target_date else app_today()
    force_regenerate = bool(request and request.force_regenerate)

    existing = await get_user_article_by_publish_date(
        db,
        user_id=current_user.id,
        publish_date=target_date,
    )
    if existing and not force_regenerate:
        existing = await reconcile_article_record(db, user_id=current_user.id, article=existing)
        await db.commit()
        await db.refresh(existing)
        return existing

    if not current_user.has_completed_assessment:
        raise BadRequestError("请先完成英语水平评测")

    redis_client = await get_redis()
    lock_key = f"lock:generate_article:{current_user.id}:{target_date.isoformat()}"

    async with redis_client.lock(lock_key, timeout=120, blocking_timeout=120):
        existing_after_lock = await get_user_article_by_publish_date(
            db,
            user_id=current_user.id,
            publish_date=target_date,
        )

        if existing_after_lock and not force_regenerate:
            existing_after_lock = await reconcile_article_record(
                db,
                user_id=current_user.id,
                article=existing_after_lock,
            )
            await db.commit()
            await db.refresh(existing_after_lock)
            return existing_after_lock

        if existing_after_lock and force_regenerate and existing_after_lock.is_completed:
            raise ConflictError("文章已经完成学习，暂不支持重新生成")

        _, _, known_words, mistake_words = await collect_generation_context(
            db,
            user_id=current_user.id,
            target_date=target_date,
            current_article_id=existing_after_lock.id if existing_after_lock else None,
        )

        generated = await article_generator.generate(
            user_level=int(current_user.english_level or 0),
            learning_goals=current_user.learning_goals or [],
            custom_goal=current_user.custom_goal,
            interests=getattr(current_user, "interests", None),
            known_words=known_words,
            mistake_words=mistake_words,
            target_date=target_date,
            feedback_reason=request.feedback_reason if request else None,
            feedback_comment=request.feedback_comment if request else None,
        )
        generated = await normalize_generated_article(
            db,
            user_id=current_user.id,
            generated=generated,
        )

        if existing_after_lock:
            article = apply_generated_article(
                existing_after_lock,
                generated,
                target_date,
                reset_progress=force_regenerate,
            )
        else:
            article = apply_generated_article(
                Article(user_id=current_user.id, created_at=utc_now()),
                generated,
                target_date,
                reset_progress=False,
            )
            db.add(article)

        if force_regenerate and request and request.feedback_reason:
            db.add(
                LearningFeedback(
                    user_id=current_user.id,
                    article_id=existing_after_lock.id if existing_after_lock else None,
                    module="lesson",
                    feedback_type=request.feedback_reason,
                    comment=request.feedback_comment,
                    payload={
                        "target_date": target_date.isoformat(),
                        "previous_title": existing_after_lock.title if existing_after_lock else None,
                    },
                )
            )

        try:
            await db.commit()
            await db.refresh(article)
        except IntegrityError:
            await db.rollback()
            race_article = await get_user_article_by_publish_date(
                db,
                user_id=current_user.id,
                publish_date=target_date,
            )
            if race_article is not None:
                return race_article
            raise

        asyncio.create_task(tts_service.warmup_article_audio(article.id, generated))
        return article


async def get_article_history_response(
    db: AsyncSession,
    *,
    user_id: int,
    page: int,
    page_size: int,
) -> ArticleListResponse:
    """获取历史文章分页。"""
    offset = (page - 1) * page_size
    total = await count_user_articles(db, user_id=user_id)
    items = await list_user_article_history(db, user_id=user_id, offset=offset, limit=page_size)

    return ArticleListResponse(
        items=[ArticleListItem.model_validate(item) for item in items],
        total=total,
    )


async def get_article_detail_response(
    db: AsyncSession,
    *,
    user_id: int,
    article_id: int,
) -> ArticleResponse:
    """获取文章详情。"""
    article = await get_user_article_by_id(db, user_id=user_id, article_id=article_id)
    if article is None:
        raise BadRequestError("文章不存在")

    article = await reconcile_article_record(db, user_id=user_id, article=article)
    await db.commit()
    await db.refresh(article)
    return ArticleResponse.model_validate(article)
