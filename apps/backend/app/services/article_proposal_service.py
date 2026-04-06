"""
学习路径建议服务。
"""

from __future__ import annotations

import asyncio
import json
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestError
from app.core.time import utc_now
from app.models.article import Article, ArticleProposal
from app.repositories.article_proposal_repository import (
    get_max_order_index,
    get_user_proposal_by_id,
    list_pending_proposals,
    list_proposal_titles_for_user,
)
from app.repositories.article_repository import (
    list_article_titles_for_user,
    list_recent_completed_articles,
)
from app.repositories.user_repository import get_user_by_id
from app.repositories.vocabulary_repository import count_user_vocabulary
from app.services.article_generator import article_generator
from app.services.article_service import collect_generation_context, normalize_generated_article
from app.services.llm_factory import build_smart_model
from app.services.tts_service import tts_service


class ArticleProposalService:
    """管理学习路径建议生成与实体化。"""

    async def get_learning_path(self, db: AsyncSession, user_id: int) -> dict[str, Any]:
        """获取当前用户的学习路径概览。"""
        completed = await list_recent_completed_articles(db, user_id=user_id, limit=10)
        proposals = await list_pending_proposals(db, user_id=user_id)

        if len(proposals) < 7:
            await self.ensure_proposals(db, user_id=user_id)
            proposals = await list_pending_proposals(db, user_id=user_id)

        user = await get_user_by_id(db, user_id=user_id)
        if user is None:
            raise BadRequestError("用户不存在")

        vocab_count = await count_user_vocabulary(db, user_id=user_id)

        return {
            "completed_articles": [
                {"id": a.id, "title": a.title, "level": a.level, "completed_at": a.completed_at}
                for a in completed
            ],
            "proposals": proposals,
            "current_level": user.english_level or 0,
            "total_vocab_count": vocab_count,
        }

    async def ensure_proposals(self, db: AsyncSession, user_id: int) -> None:
        """确保用户始终有足够的待学习建议。"""
        max_idx = await get_max_order_index(db, user_id=user_id)
        proposals = await list_pending_proposals(db, user_id=user_id)
        current_count = len(proposals)
        if current_count >= 7:
            return

        needed = 7 - current_count
        history_titles = await list_article_titles_for_user(db, user_id=user_id)
        proposal_titles = await list_proposal_titles_for_user(db, user_id=user_id)
        all_past_titles = list(set(history_titles) | set(proposal_titles))

        user = await get_user_by_id(db, user_id=user_id)
        if user is None:
            raise BadRequestError("用户不存在")

        new_proposals = await self._generate_proposal_titles(
            needed=needed,
            level=user.english_level or 0,
            interests=user.interests or [],
            past_titles=all_past_titles,
        )

        for index, proposal in enumerate(new_proposals):
            db.add(
                ArticleProposal(
                    user_id=user_id,
                    title=proposal["title"],
                    description=proposal["description"],
                    level=user.english_level or 0,
                    order_index=max_idx + index + 1,
                    status="pending",
                )
            )
        await db.commit()

    async def _generate_proposal_titles(
        self, needed: int, level: int, interests: list[str], past_titles: list[str]
    ) -> list[dict[str, str]]:
        """调用模型生成后续课程标题建议。"""
        prompt = f"""
你是一位专业的英语课程规划专家。请为一位英语等级为 Level {level} 的学习者，规划接下来 {needed} 个学习关卡标题。

用户兴趣标签：{", ".join(interests) if interests else "通用"}
已学过或已规划的标题（请勿重复）：{", ".join(past_titles[-20:])}

要求：
1. 难度循序渐进，贴合 Level {level}。
2. 标题需要具体、有场景感、适合作为学习关卡。
3. 同时给出简短中文导读，说明这一关能学到什么。
4. 仅返回 JSON 数组，格式为：[{{"title": "...", "description": "..."}}]
"""
        response = await build_smart_model().ainvoke(prompt)
        content = str(response.content).strip()
        if "```json" in content:
            content = content.split("```json", maxsplit=1)[1].split("```", maxsplit=1)[0].strip()
        elif "```" in content:
            content = content.split("```", maxsplit=1)[1].split("```", maxsplit=1)[0].strip()

        try:
            raw_data = json.loads(content)
        except json.JSONDecodeError:
            return [
                {"title": f"Next Lesson {index + 1}", "description": "继续你的英语旅程"}
                for index in range(needed)
            ]

        if not isinstance(raw_data, list):
            return [
                {"title": f"Next Lesson {index + 1}", "description": "继续你的英语旅程"}
                for index in range(needed)
            ]

        proposals: list[dict[str, str]] = []
        for item in raw_data[:needed]:
            if not isinstance(item, dict):
                continue
            title = str(item.get("title", "")).strip()
            description = str(item.get("description", "")).strip()
            if title:
                proposals.append(
                    {
                        "title": title,
                        "description": description or "继续你的英语旅程",
                    }
                )

        if proposals:
            return proposals

        return [
            {"title": f"Next Lesson {index + 1}", "description": "继续你的英语旅程"}
            for index in range(needed)
        ]

    async def realize_proposal(self, db: AsyncSession, user_id: int, proposal_id: int) -> Article:
        """将建议节点转化为正式文章。"""
        proposal = await get_user_proposal_by_id(db, user_id=user_id, proposal_id=proposal_id)
        if not proposal or proposal.status == "realized":
            if proposal and proposal.article:
                return proposal.article
            raise BadRequestError("建议节点不存在或已转化")

        user = await get_user_by_id(db, user_id=user_id)
        if user is None:
            raise BadRequestError("用户不存在")

        _, _, known_words, mistake_words = await collect_generation_context(
            db,
            user_id=user_id,
            target_date=utc_now().date(),
        )

        generated = await article_generator.generate(
            user_level=user.english_level or 0,
            learning_goals=user.learning_goals or [],
            custom_goal=proposal.title,
            interests=user.interests or [],
            known_words=known_words,
            mistake_words=mistake_words,
            target_date=utc_now().date(),
        )
        generated = generated.model_copy(update={"title": proposal.title})
        generated = await normalize_generated_article(db, user_id=user_id, generated=generated)

        article = Article(
            user_id=user_id,
            proposal_id=proposal.id,
            title=generated.title,
            level=generated.level,
            content=[item.model_dump() for item in generated.content],
            vocabulary=[item.model_dump() for item in generated.vocabulary or []],
            grammar=[item.model_dump() for item in generated.grammar or []],
            tips=[item.model_dump() for item in generated.tips or []],
            exercises=[item.model_dump() for item in generated.exercises or []],
            created_at=utc_now(),
        )
        db.add(article)
        proposal.status = "realized"

        await db.commit()
        await db.refresh(article)

        asyncio.create_task(tts_service.warmup_article_audio(article.id, generated))
        return article


article_proposal_service = ArticleProposalService()
