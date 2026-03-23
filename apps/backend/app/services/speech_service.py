"""
朗读解析服务
"""

from __future__ import annotations

from typing import Any

from app.core.config import settings
from app.services.speech import DashScopeRealtimeClient, build_reading_feedback, prepare_audio


class SpeechService:
    """基于 DashScope Realtime 的朗读解析服务"""

    def __init__(self) -> None:
        self.enabled = bool(settings.DASHSCOPE_API_KEY)
        self.realtime_client = DashScopeRealtimeClient(sample_rate=16000)

    async def analyze_audio(
        self,
        *,
        audio_bytes: bytes,
        language: str = "en",
        reference_text: str | None = None,
    ) -> dict[str, Any]:
        """解析上传音频并返回转写与宽松反馈"""
        if not self.enabled:
            raise RuntimeError("语音解析服务未配置 DASHSCOPE_API_KEY")

        prepared = prepare_audio(audio_bytes)
        transcript = await self.realtime_client.transcribe(prepared.pcm_bytes, language)

        result: dict[str, Any] = {
            "transcript": transcript,
            "duration_seconds": round(prepared.duration_seconds, 2),
            "target_duration_seconds": settings.SPEECH_TARGET_DURATION_SECONDS,
            "hard_max_duration_seconds": settings.SPEECH_HARD_MAX_DURATION_SECONDS,
            "language": language,
            "analysis_zh": "已完成朗读识别，你可以根据结果回看自己大致读到了哪些内容。",
            "similarity_score": None,
            "confidence_level": "medium",
            "missing_words": [],
            "extra_words": [],
        }

        if reference_text and transcript:
            feedback = build_reading_feedback(reference_text, transcript)
            result.update(
                {
                    "similarity_score": feedback.similarity_score,
                    "confidence_level": feedback.confidence_level,
                    "missing_words": feedback.missing_words,
                    "extra_words": feedback.extra_words,
                    "analysis_zh": feedback.analysis_zh,
                }
            )

        return result


speech_service = SpeechService()
