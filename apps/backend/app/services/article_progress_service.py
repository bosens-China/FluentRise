"""
文章进度与学习结果服务。
"""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.time import utc_now
from app.models.vocabulary import Vocabulary
from app.repositories.user_repository import get_user_by_id
from app.repositories.vocabulary_repository import list_user_vocabulary_words
from app.schemas.article import UpdateProgressRequest
from app.services.article_content_service import get_user_article
from app.services.mistake_service import infer_mistake_item_type, mistake_service
from app.services.review_service import review_service
from app.services.study_log_service import study_log_service


async def update_article_progress_for_user(
    db: AsyncSession,
    *,
    user_id: int,
    article_id: int,
    request: UpdateProgressRequest,
):
    """更新文章进度、错题与完课副作用。"""
    article = await get_user_article(db, user_id=user_id, article_id=article_id)
    article.is_read = request.is_read

    for item in request.exercise_results or []:
        item_type = infer_mistake_item_type(item.expected_answer)
        if item.is_correct:
            await mistake_service.mark_mastered(
                db,
                user_id=user_id,
                item_type=item_type,
                target_text=item.expected_answer,
            )
            continue

        await mistake_service.record_mistake(
            db,
            user_id=user_id,
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

        if request.needs_repeat is not None:
            article.needs_repeat = request.needs_repeat

        if request.is_completed and not was_completed:
            await study_log_service.check_in(db, user_id, course_title=article.title)
            existing_words = set(await list_user_vocabulary_words(db, user_id=user_id))
            new_entries: list[Vocabulary] = []

            for vocab in article.vocabulary or []:
                word = vocab.get("word")
                if not word or word in existing_words:
                    continue
                new_entries.append(
                    Vocabulary(
                        user_id=user_id,
                        article_id=article.id,
                        word=word,
                        uk_phonetic=vocab.get("uk_phonetic"),
                        us_phonetic=vocab.get("us_phonetic"),
                        meaning=vocab.get("meaning", ""),
                        created_at=utc_now(),
                    )
                )
                existing_words.add(word)

            if new_entries:
                db.add_all(new_entries)

            user = await get_user_by_id(db, user_id=user_id)
            if user and user.english_level is not None and user.english_level < 6:
                total_vocab = len(existing_words) + len(new_entries)
                level_up_thresholds = {
                    0: 40,
                    1: 100,
                    2: 250,
                    3: 500,
                    4: 1000,
                    5: 2000,
                }
                threshold = level_up_thresholds.get(user.english_level)
                if threshold is not None and total_vocab >= threshold:
                    user.english_level += 1

            await review_service.create_review_schedule(db, user_id, article.id)

            from app.services.article_proposal_service import article_proposal_service

            await article_proposal_service.ensure_proposals(db, user_id=user_id)

    article.updated_at = utc_now()
    await db.commit()
    await db.refresh(article)
    return article
