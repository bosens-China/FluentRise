"""
DashScope 文件转写客户端。
"""

from __future__ import annotations

import contextlib
import importlib
import os
import tempfile
from collections.abc import Sequence
from typing import Any

from app.core.config import settings


class DashScopeFileTranscriptionClient:
    """负责调用 DashScope 文件识别接口。"""

    def __init__(self) -> None:
        self.model = settings.DASHSCOPE_ASR_MODEL

    def transcribe_file(self, audio_bytes: bytes, *, language: str) -> str:
        """上传音频文件并提取最终转写文本。"""
        dashscope = importlib.import_module("dashscope")
        temp_path = self._write_temp_audio(audio_bytes)
        asr_options: dict[str, Any] = {
            "enable_lid": not bool(language),
            "enable_itn": False,
        }
        if language:
            asr_options["language"] = language

        try:
            response = dashscope.MultiModalConversation.call(
                api_key=settings.DASHSCOPE_API_KEY,
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": [{"text": ""}],
                    },
                    {
                        "role": "user",
                        "content": [{"audio": temp_path}],
                    },
                ],
                result_format="message",
                asr_options=asr_options,
            )
        finally:
            with contextlib.suppress(OSError):
                os.remove(temp_path)

        status_code = _get_value(response, "status_code")
        if status_code != 200:
            error_message = (
                _get_value(response, "message")
                or _extract_error_message(_get_value(response, "output"))
                or "DashScope 文件识别失败"
            )
            raise RuntimeError(str(error_message))

        transcript = _extract_transcript(response)
        if not transcript:
            raise RuntimeError("未识别到有效朗读内容，请缩短范围后重试")
        return transcript

    @staticmethod
    def _write_temp_audio(audio_bytes: bytes) -> str:
        """将上传音频写入临时文件，供 SDK 读取。"""
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
            temp_file.write(audio_bytes)
            return temp_file.name


def _extract_transcript(response: Any) -> str | None:
    """从 DashScope 响应中提取最终文本。"""
    output = _get_value(response, "output")
    choices = _get_value(output, "choices")
    if not isinstance(choices, Sequence) or isinstance(choices, (str, bytes)):
        return None

    for choice in choices:
        message = _get_value(choice, "message")
        content = _get_value(message, "content")
        if not isinstance(content, Sequence) or isinstance(content, (str, bytes)):
            continue

        for item in content:
            text = _get_value(item, "text")
            if isinstance(text, str) and text.strip():
                return text.strip()

    direct_text = _get_value(output, "text")
    if isinstance(direct_text, str) and direct_text.strip():
        return direct_text.strip()
    return None


def _extract_error_message(payload: Any) -> str | None:
    """递归提取错误信息。"""
    if isinstance(payload, dict):
        for key in ("message", "detail", "error", "code"):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value
            nested = _extract_error_message(value)
            if nested:
                return nested
    elif isinstance(payload, Sequence) and not isinstance(payload, (str, bytes)):
        for item in payload:
            nested = _extract_error_message(item)
            if nested:
                return nested
    return None


def _get_value(payload: Any, key: str) -> Any:
    """兼容 SDK 对象和字典两种访问方式。"""
    if payload is None:
        return None
    if isinstance(payload, dict):
        return payload.get(key)
    return getattr(payload, key, None)
