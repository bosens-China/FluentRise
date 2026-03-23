"""
朗读解析相关 Schema
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.services.speech import ConfidenceLevel


class SpeechAnalyzeResponse(BaseModel):
    """朗读解析结果"""

    transcript: str = Field(..., description="识别出的文本")
    duration_seconds: float = Field(..., description="音频时长")
    target_duration_seconds: int = Field(..., description="建议录音时长")
    hard_max_duration_seconds: int = Field(..., description="服务端硬上限")
    language: str = Field(..., description="识别语言")
    analysis_zh: str = Field(..., description="中文反馈说明")
    similarity_score: int | None = Field(default=None, description="与参考文本的宽松匹配度")
    confidence_level: ConfidenceLevel = Field(..., description="识别稳定度")
    missing_words: list[str] = Field(default_factory=list, description="可能漏读的重点词")
    extra_words: list[str] = Field(default_factory=list, description="可能多读或替换的重点词")
