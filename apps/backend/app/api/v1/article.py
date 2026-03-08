"""
文章 API 路由
"""

from datetime import date, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import desc, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.article import Article
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
from app.services.tts_service import tts_service

router = APIRouter(prefix="/articles", tags=["文章"])


@router.get("/today", response_model=TodayArticleResponse)
async def get_today_article(
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """
    获取今日文章

    如果没有今日文章，返回 has_article=false
    """
    today = date.today()

    result = await db.execute(
        select(Article)
        .where(Article.user_id == current_user.id)
        .where(Article.publish_date == today)
    )
    article = result.scalar_one_or_none()

    if not article:
        return TodayArticleResponse(has_article=False, article=None)

    return TodayArticleResponse(has_article=True, article=ArticleResponse.model_validate(article))


@router.post("/today/generate", response_model=ArticleResponse)
async def generate_today_article(
    request: GenerateArticleRequest | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """
    生成今日文章

    如果今日文章已存在，除非 force_regenerate=true 否则直接返回已有文章
    """
    target_date = date.today()
    if request and request.target_date:
        target_date = request.target_date
    if request and request.force_regenerate:
        force_regenerate = True
    else:
        force_regenerate = False

    # 检查是否已有今日文章
    result = await db.execute(
        select(Article)
        .where(Article.user_id == current_user.id)
        .where(Article.publish_date == target_date)
    )
    existing = result.scalar_one_or_none()

    if existing and not force_regenerate:
        return existing

    # 检查用户是否已完成评估
    if not current_user.has_completed_assessment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="请先完成英语水平评估",
        )

    # 生成新文章
    try:
        # 读取用户属性并转换类型
        raw_level = current_user.english_level
        raw_goals = current_user.learning_goals
        raw_custom = current_user.custom_goal

        user_level_val: int = int(raw_level) if raw_level is not None else 0  # type: ignore
        learning_goals_val: list[str] = raw_goals if isinstance(raw_goals, list) else []  # type: ignore
        custom_goal_val: str | None = str(raw_custom) if raw_custom else None  # type: ignore

        generated = await article_generator.generate(
            user_level=user_level_val,
            learning_goals=learning_goals_val,
            custom_goal=custom_goal_val,
            target_date=target_date,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"文章生成失败: {str(e)}",
        ) from e

    # 删除旧文章（如果存在）
    if existing:
        await db.delete(existing)
        await db.flush()

    # 创建新文章
    article = Article(
        user_id=current_user.id,
        title=generated.title,
        publish_date=target_date,
        level=generated.level,
        source_book=generated.source_book,
        source_lesson=generated.source_lesson,
        vocabulary=[v.model_dump() for v in generated.vocabulary],
        content=[c.model_dump() for c in generated.content],
        grammar=[g.model_dump() for g in generated.grammar],
        tips=[t.model_dump() for t in generated.tips],
        exercises=[e.model_dump() for e in generated.exercises],
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )

    db.add(article)
    try:
        await db.commit()
        await db.refresh(article)
    except IntegrityError:
        # 并发请求下可能触发唯一约束冲突，回退并返回已存在记录
        await db.rollback()
        retry = await db.execute(
            select(Article)
            .where(Article.user_id == current_user.id)
            .where(Article.publish_date == target_date)
        )
        existing_after_race = retry.scalar_one_or_none()
        if existing_after_race is not None:
            return existing_after_race
        raise

    return article


@router.get("/history", response_model=ArticleListResponse)
async def get_article_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """
    获取历史文章列表
    """
    offset = (page - 1) * page_size

    # 获取总数
    count_result = await db.execute(
        select(func.count()).select_from(Article).where(Article.user_id == current_user.id)
    )
    total = int(count_result.scalar_one())

    # 获取分页数据
    result = await db.execute(
        select(Article)
        .where(Article.user_id == current_user.id)
        .order_by(desc(Article.publish_date))
        .offset(offset)
        .limit(page_size)
    )
    items = result.scalars().all()
    item_responses = [ArticleListItem.model_validate(item) for item in items]

    return ArticleListResponse(items=item_responses, total=total)


@router.get("/{article_id}", response_model=ArticleResponse)
async def get_article_detail(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """
    获取文章详情
    """
    result = await db.execute(
        select(Article).where(Article.id == article_id).where(Article.user_id == current_user.id)
    )
    article = result.scalar_one_or_none()

    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文章不存在",
        )

    return article


@router.post("/{article_id}/audio")
async def generate_article_audio(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """
    生成文章音频（流式返回）
    """
    result = await db.execute(
        select(Article).where(Article.id == article_id).where(Article.user_id == current_user.id)
    )
    article = result.scalar_one_or_none()

    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文章不存在",
        )

    # 重构 ArticleContent 对象
    vocabulary_objs = [VocabularyWord(**v) for v in (article.vocabulary or [])]
    content_objs = [BilingualContent(**c) for c in (article.content or [])]
    grammar_objs = [GrammarPoint(**g) for g in (article.grammar or [])]
    tips_objs = [CultureTip(**t) for t in (article.tips or [])]
    exercises_objs = [Exercise(**e) for e in (article.exercises or [])]

    article_content = ArticleContent(
        title=article.title,
        level=article.level,
        source_book=article.source_book or 0,
        source_lesson=article.source_lesson or 0,
        vocabulary=vocabulary_objs,
        content=content_objs,
        grammar=grammar_objs,
        tips=tips_objs,
        exercises=exercises_objs,
    )

    try:
        audio_stream = tts_service.generate_audio_stream(article_content)
        return StreamingResponse(audio_stream, media_type="audio/mpeg")
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="TTS 服务不可用 (edge-tts 未安装)",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"音频生成失败: {str(e)}",
        )


@router.patch("/{article_id}/progress", response_model=ArticleResponse)
async def update_article_progress(
    article_id: int,
    request: UpdateProgressRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """
    更新文章阅读进度
    """
    result = await db.execute(
        select(Article).where(Article.id == article_id).where(Article.user_id == current_user.id)
    )
    article = result.scalar_one_or_none()

    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="文章不存在",
        )

    article.is_read = request.is_read
    if request.is_completed is not None:
        was_completed = article.is_completed
        article.is_completed = request.is_completed

        # 记录打卡，只要完成了部分进度或者标记了完成就算学习了该课程
        from app.services.study_log_service import study_log_service

        await study_log_service.check_in(db, current_user.id, course_title=article.title)

        # 第一次完成时，将生词添加到用户的生词本
        if request.is_completed and not was_completed and article.vocabulary:
            from app.models.vocabulary import Vocabulary

            # 检查是否已经存在这些单词，避免重复添加
            existing_result = await db.execute(
                select(Vocabulary.word).where(Vocabulary.user_id == current_user.id)
            )
            existing_words = {row[0] for row in existing_result.all()}

            new_vocab_entries = []
            for v_data in article.vocabulary:
                word = v_data.get("word")
                if word and word not in existing_words:
                    new_vocab_entries.append(
                        Vocabulary(
                            user_id=current_user.id,
                            article_id=article.id,
                            word=word,
                            uk_phonetic=v_data.get("uk_phonetic"),
                            us_phonetic=v_data.get("us_phonetic"),
                            meaning=v_data.get("meaning", ""),
                            created_at=datetime.utcnow(),
                        )
                    )
                    existing_words.add(word)  # 更新集合避免同一次添加中出现重复

            if new_vocab_entries:
                db.add_all(new_vocab_entries)

    article.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(article)

    return article
