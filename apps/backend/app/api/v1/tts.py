"""
TTS 音频 API。

提供单词/句子音频接口，支持按说话人自动匹配声线。
"""

from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel, Field

from app.services.tts_service import generate_cache_key, tts_service

router = APIRouter(prefix="/tts", tags=["语音合成"])


class AudioQueryParams(BaseModel):
    """音频查询参数。"""

    word: str = Field(..., min_length=1, max_length=200, description="要合成的文本")
    voice: str | None = Field(default=None, description="显式指定语音类型")
    speaker: str | None = Field(default=None, description="说话人名称，用于自动匹配声线")
    speed: float = Field(default=1.0, ge=0.5, le=2.0, description="语速")


@router.get("/audio")
async def get_audio(
    word: str = Query(..., min_length=1, max_length=200, description="要合成的文本"),
    voice: str | None = Query(default=None, description="显式指定语音类型"),
    speaker: str | None = Query(default=None, description="说话人名称"),
    speed: float = Query(default=1.0, ge=0.5, le=2.0, description="语速"),
) -> Response:
    """获取单词或句子音频。"""
    if not word.strip():
        raise HTTPException(status_code=400, detail="文本不能为空")

    try:
        resolved_voice = tts_service.resolve_voice_for_speaker(speaker, voice)
        audio_bytes = await tts_service.get_audio_bytes_cached_with_lock(
            word.strip(),
            voice=resolved_voice,
            speed=speed,
            speaker=speaker,
        )

        if not audio_bytes:
            raise HTTPException(status_code=500, detail="音频生成失败")

        cache_key = generate_cache_key(word, resolved_voice, speed)
        etag = f'"{cache_key}"'
        headers = {
            "Cache-Control": "public, max-age=2592000, immutable",
            "ETag": etag,
            "Content-Disposition": f'inline; filename="{cache_key}.mp3"',
        }

        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers=headers,
        )
    except ImportError as exc:
        raise HTTPException(status_code=503, detail="TTS 服务未安装") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"音频生成失败: {exc}") from exc


@router.get("/word/{word:path}")
async def get_word_audio(
    word: str,
    voice: str | None = Query(default=None),
    speaker: str | None = Query(default=None),
) -> Response:
    """简化版：获取单词音频。"""
    return await get_audio(
        word=word,
        voice=voice,
        speaker=speaker,
        speed=1.0,
    )
