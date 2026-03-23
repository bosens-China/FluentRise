"""
文章 API
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy import desc, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.article import Article
from app.models.learning_feedback import LearningFeedback
from app.models.vocabulary import Vocabulary
from app.schemas.article import (
    ArticleContent,
    ArticleListItem,
    ArticleListResponse,
    ArticleResponse,
    BilingualContent,
    CultureTip,
    Exercise,
    GenerateArticleRequest,
    GrammarPoint,
    TodayArticleResponse,
    UpdateProgressRequest,
    VocabularyWord,
)
from app.schemas.user import UserInfo
from app.services.article_generator import article_generator
from app.services.article_service import (
    apply_generated_article,
    collect_generation_context,
    derive_difficulty_bias,
    normalize_generated_article,
    reconcile_article_record,
)
from app.services.mistake_service import infer_mistake_item_type, mistake_service
from app.services.review_service import review_service
from app.services.study_log_service import study_log_service
from app.services.tts_service import tts_service

router = APIRouter(prefix="/articles", tags=["文章"])


@router.get("/today", response_model=TodayArticleResponse)
async def get_today_article(
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """获取今天的文章。"""
    today = date.today()
    result = await db.execute(
        select(Article)
        .where(Article.user_id == current_user.id)
        .where(Article.publish_date == today)
    )
    article = result.scalar_one_or_none()
    if article is None:
        return TodayArticleResponse(has_article=False, article=None)
    article = await reconcile_article_record(db, user_id=current_user.id, article=article)
    await db.commit()
    await db.refresh(article)
    return TodayArticleResponse(has_article=True, article=ArticleResponse.model_validate(article))


@router.post("/today/generate", response_model=ArticleResponse)
async def generate_today_article(
    request: GenerateArticleRequest | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """生成或重新生成今日文章。"""
    target_date = request.target_date if request and request.target_date else date.today()
    force_regenerate = bool(request and request.force_regenerate)

    result = await db.execute(
        select(Article)
        .where(Article.user_id == current_user.id)
        .where(Article.publish_date == target_date)
    )
    existing = result.scalar_one_or_none()
    if existing and not force_regenerate:
        existing = await reconcile_article_record(db, user_id=current_user.id, article=existing)
        await db.commit()
        await db.refresh(existing)
        return existing

    if not current_user.has_completed_assessment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="请先完成英语水平评测",
        )

    from app.db.redis import get_redis

    redis_client = await get_redis()
    lock_key = f"lock:generate_article:{current_user.id}:{target_date.isoformat()}"

    async with redis_client.lock(lock_key, timeout=120, blocking_timeout=120):
        retry_result = await db.execute(
            select(Article)
            .where(Article.user_id == current_user.id)
            .where(Article.publish_date == target_date)
        )
        existing_after_lock = retry_result.scalar_one_or_none()

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
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="文章已经完成学习，暂不支持重新生成",
            )

        user_level = int(current_user.english_level or 0)
        learning_goals = current_user.learning_goals or []
        custom_goal = current_user.custom_goal

        (
            recent_titles,
            recent_topics,
            completed_lessons,
            vocabulary_count,
            known_words,
        ) = await collect_generation_context(
            db,
            user_id=current_user.id,
            target_date=target_date,
            current_article_id=existing_after_lock.id if existing_after_lock else None,
        )
        difficulty_bias, difficulty_note = await derive_difficulty_bias(
            db,
            user_id=current_user.id,
            explicit_reason=request.feedback_reason if request else None,
        )

        try:
            generated = await article_generator.generate(
                user_level=user_level,
                learning_goals=learning_goals,
                custom_goal=custom_goal,
                known_words=known_words,
                target_date=target_date,
                recent_titles=recent_titles,
                recent_topics=recent_topics,
                completed_lessons=completed_lessons,
                vocabulary_count=vocabulary_count,
                feedback_reason=request.feedback_reason if request else None,
                feedback_comment=request.feedback_comment if request else None,
                difficulty_bias=difficulty_bias,
                difficulty_note=difficulty_note,
            )
            generated = await normalize_generated_article(
                db,
                user_id=current_user.id,
                generated=generated,
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"文章生成失败: {exc}",
            ) from exc

        if existing_after_lock:
            article = apply_generated_article(
                existing_after_lock,
                generated,
                target_date,
                reset_progress=force_regenerate,
            )
        else:
            article = apply_generated_article(
                Article(user_id=current_user.id, created_at=datetime.utcnow()),
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
                        "previous_title": existing_after_lock.title
                        if existing_after_lock
                        else None,
                        "difficulty_bias": difficulty_bias,
                    },
                )
            )

        try:
            await db.commit()
            await db.refresh(article)
        except IntegrityError:
            await db.rollback()
            race_result = await db.execute(
                select(Article)
                .where(Article.user_id == current_user.id)
                .where(Article.publish_date == target_date)
            )
            race_article = race_result.scalar_one_or_none()
            if race_article is not None:
                return race_article
            raise

        import asyncio

        asyncio.create_task(tts_service.warmup_article_audio(article.id, generated))
        return article


@router.get("/history", response_model=ArticleListResponse)
async def get_article_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """获取历史文章。"""
    offset = (page - 1) * page_size
    count_result = await db.execute(
        select(func.count()).select_from(Article).where(Article.user_id == current_user.id)
    )
    total = int(count_result.scalar_one())

    result = await db.execute(
        select(Article)
        .where(Article.user_id == current_user.id)
        .order_by(desc(Article.publish_date), desc(Article.created_at))
        .offset(offset)
        .limit(page_size)
    )
    items = result.scalars().all()

    return ArticleListResponse(
        items=[ArticleListItem.model_validate(item) for item in items],
        total=total,
    )


@router.get("/{article_id}", response_model=ArticleResponse)
async def get_article_detail(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """获取文章详情。"""
    result = await db.execute(
        select(Article).where(Article.id == article_id).where(Article.user_id == current_user.id)
    )
    article = result.scalar_one_or_none()
    if article is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="文章不存在")

    article = await reconcile_article_record(db, user_id=current_user.id, article=article)
    await db.commit()
    await db.refresh(article)

    return JSONResponse(
        content=ArticleResponse.model_validate(article).model_dump(mode="json"),
        headers={"Cache-Control": "private, max-age=604800"},
    )


@router.post("/{article_id}/audio")
async def generate_article_audio(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """生成文章音频。"""
    result = await db.execute(
        select(Article).where(Article.id == article_id).where(Article.user_id == current_user.id)
    )
    article = result.scalar_one_or_none()
    if article is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="文章不存在")

    article_content = ArticleContent(
        title=article.title,
        level=article.level,
        source_book=article.source_book,
        source_lesson=article.source_lesson,
        vocabulary=[VocabularyWord(**item) for item in (article.vocabulary or [])],
        content=[BilingualContent(**item) for item in (article.content or [])],
        grammar=[GrammarPoint(**item) for item in (article.grammar or [])],
        tips=[CultureTip(**item) for item in (article.tips or [])],
        exercises=[Exercise(**item) for item in (article.exercises or [])],
    )

    try:
        from fastapi import Response

        audio_bytes = await tts_service.generate_article_audio_bytes(article_content, article_id)
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={
                "Cache-Control": "private, max-age=2592000, immutable",
                "Content-Disposition": f'inline; filename="article_{article_id}.mp3"',
            },
        )
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="TTS 服务当前不可用",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"音频生成失败: {exc}",
        ) from exc


@router.patch("/{article_id}/progress", response_model=ArticleResponse)
async def update_article_progress(
    article_id: int,
    request: UpdateProgressRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """更新文章阅读进度并沉淀练习结果。"""
    result = await db.execute(
        select(Article).where(Article.id == article_id).where(Article.user_id == current_user.id)
    )
    article = result.scalar_one_or_none()
    if article is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="文章不存在")

    article.is_read = request.is_read

    for item in request.exercise_results or []:
        item_type = infer_mistake_item_type(item.expected_answer)
        if item.is_correct:
            await mistake_service.mark_mastered(
                db,
                user_id=current_user.id,
                item_type=item_type,
                target_text=item.expected_answer,
            )
            continue

        await mistake_service.record_mistake(
            db,
            user_id=current_user.id,
            source_type="article",
            item_type=item_type,
            target_text=item.expected_answer,
            prompt_text=item.question,
            user_answer=item.user_answer,
            context_text=article.title,
        )

    if request.is_completed is not None:
        was_completed = article.is_completed
        article.is_completed = request.is_completed

        if request.is_completed and not was_completed:
            await study_log_service.check_in(db, current_user.id, course_title=article.title)

            existing_words_result = await db.execute(
                select(Vocabulary.word).where(Vocabulary.user_id == current_user.id)
            )
            existing_words = {row[0] for row in existing_words_result.all()}
            new_entries: list[Vocabulary] = []

            for vocab in article.vocabulary or []:
                word = vocab.get("word")
                if not word or word in existing_words:
                    continue
                new_entries.append(
                    Vocabulary(
                        user_id=current_user.id,
                        article_id=article.id,
                        word=word,
                        uk_phonetic=vocab.get("uk_phonetic"),
                        us_phonetic=vocab.get("us_phonetic"),
                        meaning=vocab.get("meaning", ""),
                        created_at=datetime.utcnow(),
                    )
                )
                existing_words.add(word)

            if new_entries:
                db.add_all(new_entries)

            await review_service.create_review_schedule(db, current_user.id, article.id)

    article.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(article)
    return article
