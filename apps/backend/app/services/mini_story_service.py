"""
变种小故事生成与校验服务。
"""

from __future__ import annotations

import uuid

from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

from app.models.article import Article
from app.schemas.article import MiniStoryEvaluateResponse, MiniStoryResponse
from app.services.llm_factory import build_chat_model


class MiniStoryQuestionInternal(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:8])
    question_en: str = Field(..., description="英文问题")
    question_zh: str = Field(..., description="中文翻译")


class MiniStoryContentInternal(BaseModel):
    story_en: str = Field(..., description="小故事英文")
    story_zh: str = Field(..., description="小故事中文")
    questions: list[MiniStoryQuestionInternal] = Field(..., description="2-3个关于故事内容的小问题")


class MiniStoryEvaluationResultInternal(BaseModel):
    is_passed: bool = Field(..., description="是否及格(80分以上算及格)")
    score: int = Field(..., description="评分(0-100)")
    feedback_zh: str = Field(..., description="中文反馈和鼓励建议")


class MiniStoryService:
    """变种小故事相关的业务服务。"""

    def __init__(self) -> None:
        # 生成故事可以使用稍微有创造性的温度
        self.generation_llm = build_chat_model(temperature=0.7)
        self.structured_generation_llm = self.generation_llm.with_structured_output(
            MiniStoryContentInternal, method="function_calling"
        )

        # 评分模型需要更严谨，降低温度
        self.eval_llm = build_chat_model(temperature=0.3)
        self.structured_eval_llm = self.eval_llm.with_structured_output(
            MiniStoryEvaluationResultInternal, method="function_calling"
        )

    async def generate_story(self, article: Article) -> MiniStoryResponse:
        """基于本课核心生词生成变种小故事。"""
        vocab = [v.get("word", "") for v in (article.vocabulary or [])]
        vocab_str = ", ".join(vocab) if vocab else "无"

        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "你是一名拥有丰富经验的英语教师。请根据用户今天学习的核心生词，写一篇极短（约50-80词）、结构简单、场景生活化且有趣的变种小故事。\n"
                    "同时，基于这篇故事出 2 到 3 道简单的英文问答题（需提供中文翻译）。\n"
                    "输出的内容结构要满足所需的 schema。",
                ),
                (
                    "user",
                    f"核心生词：{vocab_str}\n\n请编写故事，并出相关问答题。确保故事尽量包含这些生词并贴近实际生活场景。",
                ),
            ]
        )

        chain = prompt | self.structured_generation_llm
        try:
            result = await chain.ainvoke({})
            content = (
                result
                if isinstance(result, MiniStoryContentInternal)
                else MiniStoryContentInternal.model_validate(result)
            )

            # 转换为对外的响应结构
            return MiniStoryResponse(
                story_en=content.story_en,
                story_zh=content.story_zh,
                questions=[
                    {
                        "id": q.id,
                        "question_en": q.question_en,
                        "question_zh": q.question_zh,
                    }
                    for q in content.questions
                ],
            )
        except Exception as e:
            raise ValueError(f"小故事生成失败: {e}") from e

    async def evaluate_answers(
        self,
        story_en: str,
        questions: list[dict[str, str]],
        answers: dict[str, str],
    ) -> MiniStoryEvaluateResponse:
        """评估用户对小故事的作答。"""
        qa_pairs = []
        for q in questions:
            qid = q.get("id", "")
            user_ans = answers.get(qid, "（未作答）")
            qa_pairs.append(f"问题: {q.get('question_en')}\n用户回答: {user_ans}")

        qa_str = "\n\n".join(qa_pairs)

        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "你是温柔且专业的英语老师。请根据给定的故事原文，校验用户对于几个关于故事的问题的简答。\n"
                    "标准：\n"
                    "1. 用户可以用全英文、全中文、或者中英夹杂来回答。\n"
                    "2. 只要核心意思表达准确即给高分，无需苛求语法完美。\n"
                    "3. 如果总评达到 80 分即视为及格 (is_passed = True)。\n"
                    "请给出最终的评分，以及一段鼓励性质的中文点评和反馈。",
                ),
                (
                    "user",
                    f"故事原文：\n{story_en}\n\n用户问答列表：\n{qa_str}\n\n请给出评估结果。",
                ),
            ]
        )

        chain = prompt | self.structured_eval_llm
        try:
            result = await chain.ainvoke({})
            eval_res = (
                result
                if isinstance(result, MiniStoryEvaluationResultInternal)
                else MiniStoryEvaluationResultInternal.model_validate(result)
            )

            return MiniStoryEvaluateResponse(
                is_passed=eval_res.is_passed,
                score=eval_res.score,
                feedback_zh=eval_res.feedback_zh,
            )
        except Exception as e:
            raise ValueError(f"问答校验失败: {e}") from e


mini_story_service = MiniStoryService()
