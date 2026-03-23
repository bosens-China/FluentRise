"""
DashScope Realtime 转写客户端
"""

from __future__ import annotations

import asyncio
import base64
import contextlib
import json
from typing import Any

import websockets

from app.core.config import settings


class DashScopeRealtimeClient:
    """负责把 PCM 音频发送到 DashScope Realtime 并提取转写结果"""

    def __init__(self, *, sample_rate: int) -> None:
        self.sample_rate = sample_rate
        self.base_url = "wss://dashscope.aliyuncs.com/api-ws/v1/realtime"

    async def transcribe(self, pcm_bytes: bytes, language: str) -> str:
        """转写 PCM 音频为文本"""
        headers = {
            "Authorization": f"Bearer {settings.DASHSCOPE_API_KEY}",
            "OpenAI-Beta": "realtime=v1",
        }
        uri = f"{self.base_url}?model={settings.DASHSCOPE_REALTIME_MODEL}"

        async with websockets.connect(
            uri,
            additional_headers=headers,
            max_size=8 * 1024 * 1024,
            ping_interval=20,
            ping_timeout=20,
        ) as websocket:
            await websocket.send(
                json.dumps(
                    {
                        "event_id": "speech_session_update",
                        "type": "session.update",
                        "session": {
                            "modalities": ["text"],
                            "input_audio_format": "pcm",
                            "sample_rate": self.sample_rate,
                            "input_audio_transcription": {
                                "language": language,
                            },
                            "turn_detection": None,
                        },
                    }
                )
            )

            for index, chunk in enumerate(_chunk_audio(pcm_bytes), start=1):
                await websocket.send(
                    json.dumps(
                        {
                            "event_id": f"speech_audio_{index}",
                            "type": "input_audio_buffer.append",
                            "audio": base64.b64encode(chunk).decode("utf-8"),
                        }
                    )
                )

            await websocket.send(
                json.dumps(
                    {
                        "event_id": "speech_commit",
                        "type": "input_audio_buffer.commit",
                    }
                )
            )

            return await self._collect_transcript(websocket)

    async def _collect_transcript(self, websocket: websockets.ClientConnection) -> str:
        """从事件流中提取最终转写文本"""
        transcript_parts: list[str] = []
        final_transcript: str | None = None

        while True:
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=12)
            except TimeoutError:
                break

            event = json.loads(message)
            event_type = str(event.get("type") or "")

            if _is_transcript_event(event_type):
                piece = _extract_transcript_piece(event)
                if piece:
                    if event_type.endswith(".delta"):
                        transcript_parts.append(piece)
                    else:
                        final_transcript = piece
                        break

            if event_type in {"error", "response.error"}:
                error_message = _extract_error_message(event)
                raise RuntimeError(error_message or "语音解析服务调用失败")

        with contextlib.suppress(Exception):
            await websocket.close()

        transcript = (final_transcript or " ".join(transcript_parts)).strip()
        if not transcript:
            raise RuntimeError("没有识别到足够稳定的朗读内容，请缩短范围后重试")
        return transcript


def _chunk_audio(pcm_bytes: bytes, chunk_size: int = 3200) -> list[bytes]:
    """按固定大小切分 PCM 字节"""
    return [pcm_bytes[index : index + chunk_size] for index in range(0, len(pcm_bytes), chunk_size)]


def _is_transcript_event(event_type: str) -> bool:
    """识别与转写文本相关的事件"""
    return any(token in event_type for token in ("transcript", "transcription", "output_text"))


def _extract_transcript_piece(payload: Any) -> str | None:
    """尽量从不同事件结构中提取文本字段"""
    for key in ("transcript", "delta", "text"):
        value = _find_first_text(payload, key)
        if value:
            return value.strip()
    return None


def _find_first_text(payload: Any, target_key: str) -> str | None:
    """递归查找第一个匹配的文本字段"""
    if isinstance(payload, dict):
        for key, value in payload.items():
            if key == target_key and isinstance(value, str) and value.strip():
                return value
            found = _find_first_text(value, target_key)
            if found:
                return found
    elif isinstance(payload, list):
        for item in payload:
            found = _find_first_text(item, target_key)
            if found:
                return found
    return None


def _extract_error_message(payload: Any) -> str | None:
    """从错误事件中提取可读信息"""
    if isinstance(payload, dict):
        for key in ("message", "detail", "error"):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value
            if isinstance(value, dict):
                nested = _extract_error_message(value)
                if nested:
                    return nested
    return None
