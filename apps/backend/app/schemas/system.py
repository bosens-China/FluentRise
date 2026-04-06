"""
系统能力配置相关 Schema。
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class Quote(BaseModel):
    """鼓励语录。"""

    en: str
    zh: str


class EncouragementRequest(BaseModel):
    """鼓励文案请求。"""

    context_type: str = Field(..., description="场景类型：lesson/review/playground")
    title: str | None = Field(None, description="课程标题")
    accuracy: float | None = Field(None, description="正确率")
    streak_days: int | None = Field(None, description="连续打卡天数")


class LlmConfigSummary(BaseModel):
    """LLM 能力摘要。"""

    provider: str = Field(..., description="当前 LLM 提供商")
    enabled: bool = Field(..., description="是否已配置可用的 LLM")
    fast_model: str = Field(..., description="快速模型")
    smart_model: str = Field(..., description="推理模型")
    base_url_configured: bool = Field(..., description="是否配置了自定义 Base URL")
    encouragement_enabled: bool = Field(..., description="是否支持 AI 鼓励文案")


class SpeechConfigSummary(BaseModel):
    """语音识别能力摘要。"""

    provider: str = Field(..., description="当前语音服务提供商")
    enabled: bool = Field(..., description="是否已配置可用的语音识别")
    mode: str = Field(..., description="当前语音识别模式")
    model: str = Field(..., description="当前语音模型")
    default_language: str = Field(..., description="默认识别语言")
    target_duration_seconds: int = Field(..., description="建议录音时长")
    hard_max_duration_seconds: int = Field(..., description="录音硬上限")
    reading_pass_score: int = Field(..., description="朗读通过分数")
    max_attempts: int = Field(..., description="朗读和故事环节的最大尝试次数")
    accepted_content_types: list[str] = Field(
        ...,
        description="后端当前接受的音频 MIME 类型",
    )
    supported_audio_formats: list[str] = Field(
        ...,
        description="后端当前支持的音频格式",
    )


class TtsConfigSummary(BaseModel):
    """TTS 能力摘要。"""

    enabled: bool = Field(..., description="是否启用语音合成")
    default_voice: str = Field(..., description="默认发音人")


class ArticleLearningConfigSummary(BaseModel):
    """文章学习流程配置。"""

    listen_required_count: int = Field(..., description="解锁跟读前需要完成的精听次数")


class ReviewConfigSummary(BaseModel):
    """复习流程配置。"""

    total_stages: int = Field(..., description="复习总轮次")
    stage_intervals_days: list[int] = Field(..., description="每一轮复习对应的间隔天数")


class PlaygroundConfigSummary(BaseModel):
    """游乐园流程配置。"""

    history_page_size: int = Field(..., description="练习历史默认分页大小")
    max_attempts: int = Field(..., description="每题最大尝试次数")


class SystemConfigResponse(BaseModel):
    """系统配置响应。"""

    llm: LlmConfigSummary
    tts: TtsConfigSummary
    speech: SpeechConfigSummary
    article_learning: ArticleLearningConfigSummary
    review: ReviewConfigSummary
    playground: PlaygroundConfigSummary
