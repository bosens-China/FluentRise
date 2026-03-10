"""
游乐场 API 路由
"""

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.practice_session import PracticeSession
from app.schemas.user import UserInfo
from app.services.question_generator import generate_questions

router = APIRouter(prefix="/playground", tags=["游乐场"])


# ========== 请求/响应模型 ==========

class QuestionResponse(BaseModel):
    """题目响应"""
    id: str = Field(..., description="题目唯一ID")
    type: str = Field(..., description="题目类型: audio/meaning/fill_blank")
    word: str = Field(..., description="目标单词")
    meaning: str = Field(..., description="中文释义")
    hint: str = Field(..., description="首字母提示")
    uk_phonetic: str | None = Field(None, description="英式音标")
    us_phonetic: str | None = Field(None, description="美式音标")
    sentence: str | None = Field(None, description="填空句子（含下划线）")
    sentence_translation: str | None = Field(None, description="句子中文翻译")
    word_audio_url: str | None = Field(None, description="单词音频 HTTP URL (可缓存)")
    sentence_audio_url: str | None = Field(None, description="句子音频 HTTP URL (可缓存)")


class QuestionListResponse(BaseModel):
    """题目列表响应"""
    questions: list[QuestionResponse]
    total: int


class SubmitAnswerItem(BaseModel):
    """单个题目提交"""
    question_id: str
    word: str
    is_correct: bool
    attempts: int = Field(default=1, ge=1, le=3, description="尝试次数")
    showed_answer: bool = Field(default=False, description="是否显示了答案")


class SubmitPracticeRequest(BaseModel):
    """提交练习请求"""
    answers: list[SubmitAnswerItem]
    duration_seconds: int = Field(..., ge=0, description="用时（秒）")
    max_streak: int = Field(default=0, ge=0, description="最高连击数")


class SubmitPracticeResponse(BaseModel):
    """提交练习响应"""
    session_id: int
    total: int
    correct: int
    wrong: int
    skipped: int
    accuracy: float
    message: str


class PracticeSessionResponse(BaseModel):
    """练习历史响应"""
    id: int
    total_questions: int
    correct_count: int
    wrong_count: int
    skipped_count: int
    accuracy: float
    duration_seconds: int
    max_streak: int
    created_at: datetime


class PracticeHistoryResponse(BaseModel):
    """练习历史列表响应"""
    sessions: list[PracticeSessionResponse]
    total: int


class PracticeStatsResponse(BaseModel):
    """练习统计响应"""
    total_sessions: int
    total_questions: int
    total_correct: int
    total_wrong: int
    total_skipped: int
    overall_accuracy: float
    total_duration_minutes: int
    best_streak: int


# ========== API 端点 ==========

@router.get("/questions", response_model=QuestionListResponse)
async def get_questions(
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """
    获取今日练习题目（30道，已随机打乱）
    
    题目来源：
    1. 今日文章单词（优先）
    2. 生词本单词
    3. 历史文章单词
    
    题型分布：
    - 听音写词：10道
    - 释义写词：10道
    - 句子填空：10道
    """
    questions = await generate_questions(db, current_user.id)
    
    if not questions:
        raise HTTPException(
            status_code=404,
            detail="暂无足够单词生成题目，请先完成文章学习并积累生词"
        )
    
    return QuestionListResponse(
        questions=[QuestionResponse(**q.to_dict()) for q in questions],
        total=len(questions),
    )


@router.post("/submit", response_model=SubmitPracticeResponse)
async def submit_practice(
    request: SubmitPracticeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """
    提交练习结果
    """
    # 计算统计数据
    total = len(request.answers)
    correct = sum(1 for a in request.answers if a.is_correct)
    skipped = sum(1 for a in request.answers if a.showed_answer)
    wrong = total - correct - skipped
    
    # 确保数值正确
    if wrong < 0:
        wrong = 0
    
    accuracy = round(correct / total * 100, 1) if total > 0 else 0
    
    # 构建详情
    details = [
        {
            "word": a.word,
            "is_correct": a.is_correct,
            "attempts": a.attempts,
            "showed_answer": a.showed_answer,
        }
        for a in request.answers
    ]
    
    # 保存会话记录
    session = PracticeSession(
        user_id=current_user.id,
        total_questions=total,
        correct_count=correct,
        wrong_count=wrong,
        skipped_count=skipped,
        duration_seconds=request.duration_seconds,
        max_streak=request.max_streak,
        details=details,
    )
    
    db.add(session)
    await db.commit()
    await db.refresh(session)
    
    # 生成鼓励消息
    messages = {
        "perfect": "太棒了！全对！🎉",
        "excellent": "非常优秀！继续加油！💪",
        "good": "做得不错，继续进步！👍",
        "average": "还有提升空间，再接再厉！📚",
        "needs_work": "多多练习，你会越来越好的！🌟",
    }
    
    if accuracy == 100:
        message = messages["perfect"]
    elif accuracy >= 90:
        message = messages["excellent"]
    elif accuracy >= 70:
        message = messages["good"]
    elif accuracy >= 50:
        message = messages["average"]
    else:
        message = messages["needs_work"]
    
    return SubmitPracticeResponse(
        session_id=session.id,
        total=total,
        correct=correct,
        wrong=wrong,
        skipped=skipped,
        accuracy=accuracy,
        message=message,
    )


@router.get("/history", response_model=PracticeHistoryResponse)
async def get_practice_history(
    page: int = 1,
    page_size: int = 10,
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """
    获取练习历史
    """
    # 获取总数
    count_result = await db.execute(
        select(func.count())
        .select_from(PracticeSession)
        .where(PracticeSession.user_id == current_user.id)
    )
    total = count_result.scalar() or 0
    
    # 获取列表
    result = await db.execute(
        select(PracticeSession)
        .where(PracticeSession.user_id == current_user.id)
        .order_by(desc(PracticeSession.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    sessions = result.scalars().all()
    
    return PracticeHistoryResponse(
        sessions=[
            PracticeSessionResponse(
                id=s.id,
                total_questions=s.total_questions,
                correct_count=s.correct_count,
                wrong_count=s.wrong_count,
                skipped_count=s.skipped_count,
                accuracy=round(s.correct_count / s.total_questions * 100, 1) if s.total_questions > 0 else 0,
                duration_seconds=s.duration_seconds,
                max_streak=s.max_streak,
                created_at=s.created_at,
            )
            for s in sessions
        ],
        total=total,
    )


@router.get("/stats", response_model=PracticeStatsResponse)
async def get_practice_stats(
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
) -> Any:
    """
    获取练习统计
    """
    result = await db.execute(
        select(
            func.count().label("total_sessions"),
            func.sum(PracticeSession.total_questions).label("total_questions"),
            func.sum(PracticeSession.correct_count).label("total_correct"),
            func.sum(PracticeSession.wrong_count).label("total_wrong"),
            func.sum(PracticeSession.skipped_count).label("total_skipped"),
            func.sum(PracticeSession.duration_seconds).label("total_duration"),
            func.max(PracticeSession.max_streak).label("best_streak"),
        )
        .where(PracticeSession.user_id == current_user.id)
    )
    row = result.one_or_none()
    
    if not row or row.total_sessions == 0:
        return PracticeStatsResponse(
            total_sessions=0,
            total_questions=0,
            total_correct=0,
            total_wrong=0,
            total_skipped=0,
            overall_accuracy=0,
            total_duration_minutes=0,
            best_streak=0,
        )
    
    total_questions = row.total_questions or 0
    total_correct = row.total_correct or 0
    
    overall_accuracy = round(total_correct / total_questions * 100, 1) if total_questions > 0 else 0
    
    return PracticeStatsResponse(
        total_sessions=row.total_sessions,
        total_questions=total_questions,
        total_correct=total_correct,
        total_wrong=row.total_wrong or 0,
        total_skipped=row.total_skipped or 0,
        overall_accuracy=overall_accuracy,
        total_duration_minutes=(row.total_duration or 0) // 60,
        best_streak=row.best_streak or 0,
    )
