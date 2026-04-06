"""
朗读解析 API。
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.api.deps import CurrentUser
from app.core.config import settings
from app.schemas.speech import SpeechAnalyzeResponse
from app.services.speech_service import speech_service

router = APIRouter(prefix="/speech", tags=["朗读解析"])


@router.post("/analyze", response_model=SpeechAnalyzeResponse, summary="解析录音内容")
async def analyze_speech(
    current_user: CurrentUser,
    file: UploadFile = File(...),
    language: str = Form(default=settings.SPEECH_DEFAULT_LANGUAGE),
    reference_text: str | None = Form(default=None),
) -> Any:
    """上传录音并返回识别与宽松反馈。"""
    del current_user

    if file.content_type not in settings.SPEECH_ACCEPTED_CONTENT_TYPES:
        accepted_types = ", ".join(settings.SPEECH_ACCEPTED_CONTENT_TYPES)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"当前仅支持这些音频类型：{accepted_types}",
        )

    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="上传的音频内容不能为空",
        )

    try:
        result = await speech_service.analyze_audio(
            audio_bytes=audio_bytes,
            language=language,
            reference_text=reference_text,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except RuntimeError as exc:
        status_code = (
            status.HTTP_503_SERVICE_UNAVAILABLE
            if not settings.DASHSCOPE_API_KEY
            else status.HTTP_502_BAD_GATEWAY
        )
        raise HTTPException(status_code=status_code, detail=str(exc)) from exc
    finally:
        await file.close()

    return SpeechAnalyzeResponse(**result)
