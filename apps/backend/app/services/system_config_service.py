"""
系统能力配置服务。
"""

from __future__ import annotations

from app.core.config import settings
from app.schemas.system import (
    ArticleLearningConfigSummary,
    LlmConfigSummary,
    PlaygroundConfigSummary,
    ReviewConfigSummary,
    SpeechConfigSummary,
    SystemConfigResponse,
    TtsConfigSummary,
)


class SystemConfigService:
    """集中构建前端可消费的系统能力配置。"""

    def get_config(self) -> SystemConfigResponse:
        """返回系统能力配置。"""
        llm_enabled = bool(settings.OPENAI_API_KEY)
        speech_enabled = bool(settings.DASHSCOPE_API_KEY)

        return SystemConfigResponse(
            llm=LlmConfigSummary(
                provider="openai",
                enabled=llm_enabled,
                fast_model=settings.OPENAI_FAST_MODEL,
                smart_model=settings.OPENAI_SMART_MODEL,
                base_url_configured=bool(settings.OPENAI_BASE_URL),
                encouragement_enabled=llm_enabled,
            ),
            tts=TtsConfigSummary(
                enabled=True,
                default_voice=settings.TTS_DEFAULT_VOICE,
            ),
            speech=SpeechConfigSummary(
                provider=settings.SPEECH_PROVIDER,
                enabled=speech_enabled,
                mode="file",
                model=settings.DASHSCOPE_ASR_MODEL,
                default_language=settings.SPEECH_DEFAULT_LANGUAGE,
                target_duration_seconds=settings.SPEECH_TARGET_DURATION_SECONDS,
                hard_max_duration_seconds=settings.SPEECH_HARD_MAX_DURATION_SECONDS,
                reading_pass_score=settings.SPEECH_READING_PASS_SCORE,
                max_attempts=settings.SPEECH_MAX_ATTEMPTS,
                accepted_content_types=list(settings.SPEECH_ACCEPTED_CONTENT_TYPES),
                supported_audio_formats=list(settings.SPEECH_SUPPORTED_AUDIO_FORMATS),
            ),
            article_learning=ArticleLearningConfigSummary(
                listen_required_count=settings.ARTICLE_LISTEN_REQUIRED_COUNT,
            ),
            review=ReviewConfigSummary(
                total_stages=settings.REVIEW_TOTAL_STAGES,
                stage_intervals_days=list(settings.REVIEW_STAGE_INTERVALS_DAYS),
            ),
            playground=PlaygroundConfigSummary(
                history_page_size=settings.PLAYGROUND_HISTORY_PAGE_SIZE,
                max_attempts=settings.PLAYGROUND_MAX_ATTEMPTS,
            ),
        )

    def build_startup_lines(self) -> list[str]:
        """构建启动时的配置摘要。"""
        config = self.get_config()
        return [
            (
                "LLM:"
                f" enabled={'yes' if config.llm.enabled else 'no'}"
                f" provider={config.llm.provider}"
                f" fast={config.llm.fast_model}"
                f" smart={config.llm.smart_model}"
                f" base_url={'custom' if config.llm.base_url_configured else 'default'}"
            ),
            (
                "Speech:"
                f" enabled={'yes' if config.speech.enabled else 'no'}"
                f" provider={config.speech.provider}"
                f" mode={config.speech.mode}"
                f" model={config.speech.model}"
                f" formats={','.join(config.speech.supported_audio_formats)}"
                f" target={config.speech.target_duration_seconds}s"
                f" hard_max={config.speech.hard_max_duration_seconds}s"
                f" pass_score={config.speech.reading_pass_score}"
                f" max_attempts={config.speech.max_attempts}"
            ),
            (
                "Article:"
                f" listen_required={config.article_learning.listen_required_count}"
                f" default_voice={config.tts.default_voice}"
            ),
            (
                "Review:"
                f" total_stages={config.review.total_stages}"
                f" intervals={','.join(str(value) for value in config.review.stage_intervals_days)}"
                f" playground_page_size={config.playground.history_page_size}"
                f" playground_max_attempts={config.playground.max_attempts}"
            ),
        ]


system_config_service = SystemConfigService()
