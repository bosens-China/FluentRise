"""
朗读音频预处理
"""

from __future__ import annotations

import audioop
import wave
from dataclasses import dataclass
from io import BytesIO

from app.core.config import settings

TARGET_SAMPLE_RATE = 16000


@dataclass
class PreparedAudio:
    """标准化后的音频数据"""

    pcm_bytes: bytes
    duration_seconds: float
    original_sample_rate: int
    normalized_sample_rate: int
    channels: int


def prepare_audio(audio_bytes: bytes) -> PreparedAudio:
    """校验 WAV 音频并标准化为 16k 单声道 PCM"""
    if not audio_bytes:
        raise ValueError("音频内容不能为空")

    with wave.open(BytesIO(audio_bytes), "rb") as wav_file:
        channels = wav_file.getnchannels()
        sample_width = wav_file.getsampwidth()
        sample_rate = wav_file.getframerate()
        frame_count = wav_file.getnframes()
        frames = wav_file.readframes(frame_count)

    if frame_count <= 0 or sample_rate <= 0:
        raise ValueError("音频文件无效")

    duration_seconds = frame_count / sample_rate
    if duration_seconds > settings.SPEECH_HARD_MAX_DURATION_SECONDS:
        raise ValueError(
            f"录音时长超过安全上限，请尽量控制在 {settings.SPEECH_TARGET_DURATION_SECONDS} 秒内"
        )

    pcm16_frames = frames if sample_width == 2 else audioop.lin2lin(frames, sample_width, 2)
    mono_frames = audioop.tomono(pcm16_frames, 2, 0.5, 0.5) if channels > 1 else pcm16_frames
    normalized_frames = mono_frames
    if sample_rate != TARGET_SAMPLE_RATE:
        normalized_frames, _ = audioop.ratecv(
            mono_frames,
            2,
            1,
            sample_rate,
            TARGET_SAMPLE_RATE,
            None,
        )

    return PreparedAudio(
        pcm_bytes=normalized_frames,
        duration_seconds=duration_seconds,
        original_sample_rate=sample_rate,
        normalized_sample_rate=TARGET_SAMPLE_RATE,
        channels=channels,
    )
